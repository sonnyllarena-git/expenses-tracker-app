import { and, desc, eq, isNull, sql, type ExtractTablesWithRelations } from 'drizzle-orm';
import type { ExpoSQLiteTransaction } from 'drizzle-orm/expo-sqlite';

import { db } from '../client';
import { expenses, wallets, walletTransactions } from '../schema';
import type * as schema from '../schema';
import { generateId } from '@/utils/uuid';
import { walletBalanceAdjustments } from '@/utils/wallet';
import type { Expense, RecurringFrequency } from '@/types';

export type Tx = ExpoSQLiteTransaction<typeof schema, ExtractTablesWithRelations<typeof schema>>;

export function toExpense(row: typeof expenses.$inferSelect): Expense {
  return {
    id: row.id,
    userId: row.userId,
    addedByUserId: row.addedByUserId,
    amount: row.amount,
    categoryId: row.categoryId,
    subcategoryId: row.subcategoryId,
    date: row.date,
    description: row.description,
    tags: JSON.parse(row.tags) as string[],
    receiptPhotoPath: row.receiptPhotoPath,
    isRecurring: row.isRecurring,
    recurringFrequency: row.recurringFrequency as RecurringFrequency | null,
    recurringTemplateId: row.recurringTemplateId,
    budgetId: row.budgetId,
    walletId: row.walletId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export interface NewExpenseInput {
  userId: string;
  addedByUserId?: string | null;
  amount: number;
  categoryId: string;
  /** Optional finer-grained classification within categoryId. */
  subcategoryId?: string | null;
  date: string;
  description?: string;
  tags?: string[];
  receiptPhotoPath?: string | null;
  /** Which wallet this was paid from. Omit for expenses not tied to a wallet. */
  walletId?: string | null;
}

/**
 * Real expenses only — one-off rows and materialized recurring instances.
 * Excludes recurring _templates_ (`recurringFrequency IS NOT NULL`), which
 * live in this same table as rule definitions, not actual spend events; see
 * db/queries/recurring.ts and DATABASE_SCHEMA.md's recurring-expense design.
 */
export async function listExpenses(userId: string): Promise<Expense[]> {
  const rows = await db
    .select()
    .from(expenses)
    .where(and(eq(expenses.userId, userId), isNull(expenses.recurringFrequency)))
    .orderBy(desc(expenses.date));
  return rows.map(toExpense);
}

/**
 * WALLET INTEGRATION — READ BEFORE TOUCHING insert/update/deleteExpense:
 *
 * expo-sqlite's drizzle driver executes every statement synchronously
 * under the hood, and db.transaction()'s begin/callback/commit sequence is
 * itself a plain synchronous function (see node_modules/drizzle-orm/
 * expo-sqlite/session.js). If the callback passed to db.transaction() is
 * `async` and contains `await`, the callback returns a pending Promise the
 * instant it hits that `await`, and the transaction wrapper — which does
 * NOT await its callback — immediately runs COMMIT right then, before any
 * of the awaited statements have actually executed. The statements still
 * run eventually (on a later microtask), but by then the transaction has
 * already been committed (or, on error, has nothing open left to roll
 * back), so nothing inside is actually atomic.
 *
 * The fix: transaction callbacks here must be plain synchronous functions,
 * and every statement inside must call `.run()` / `.all()` / `.get()`
 * directly instead of being awaited — that forces synchronous execution
 * within the begin/commit window. Do not write `async (tx) => { await ... }`
 * in this file.
 */

/**
 * Exported so db/queries/loans.ts's recordLoanPayment can reuse the exact
 * same wallet-balance math for loan payments (which are just expenses tied
 * to a "Loan Payment" category) — see walletBalanceAdjustments' own comment
 * on why this logic lives in exactly one place.
 */
export function syncWalletForExpense(
  tx: Tx,
  expenseId: string,
  next: { walletId: string; amount: number; date: string; description: string } | null
): void {
  const linked = tx
    .select()
    .from(walletTransactions)
    .where(eq(walletTransactions.expenseId, expenseId))
    .all();
  const previous = linked[0] ? { walletId: linked[0].walletId, amount: linked[0].amount } : null;

  for (const adjustment of walletBalanceAdjustments(previous, next)) {
    tx.update(wallets)
      .set({ balance: sql`${wallets.balance} + ${adjustment.delta}` })
      .where(eq(wallets.id, adjustment.walletId))
      .run();
  }

  if (linked.length > 0) {
    tx.delete(walletTransactions).where(eq(walletTransactions.expenseId, expenseId)).run();
  }

  if (next) {
    tx.insert(walletTransactions)
      .values({
        id: generateId(),
        walletId: next.walletId,
        expenseId,
        amount: next.amount,
        type: 'debit',
        description: next.description,
        date: next.date,
      })
      .run();
  }
}

export async function insertExpense(input: NewExpenseInput): Promise<Expense> {
  if (input.amount <= 0) {
    throw new Error('Expense amount must be positive');
  }

  const created = db.transaction((tx) => {
    const [row] = tx
      .insert(expenses)
      .values({
        id: generateId(),
        userId: input.userId,
        addedByUserId: input.addedByUserId ?? null,
        amount: input.amount,
        categoryId: input.categoryId,
        subcategoryId: input.subcategoryId ?? null,
        date: input.date,
        description: input.description ?? '',
        tags: JSON.stringify(input.tags ?? []),
        receiptPhotoPath: input.receiptPhotoPath ?? null,
        isRecurring: false,
        walletId: input.walletId ?? null,
      })
      .returning()
      .all();

    if (input.walletId) {
      syncWalletForExpense(tx, row.id, {
        walletId: input.walletId,
        amount: input.amount,
        date: input.date,
        description: input.description ?? '',
      });
    }

    return row;
  });

  return toExpense(created);
}

export interface UpdateExpenseInput {
  amount?: number;
  categoryId?: string;
  /** Explicit `null` clears the subcategory; omit the key to leave it unchanged. */
  subcategoryId?: string | null;
  date?: string;
  description?: string;
  tags?: string[];
  receiptPhotoPath?: string | null;
  /** Explicit `null` clears the wallet; omit the key to leave it unchanged. */
  walletId?: string | null;
}

export async function updateExpense(id: string, input: UpdateExpenseInput): Promise<Expense> {
  if (input.amount !== undefined && input.amount <= 0) {
    throw new Error('Expense amount must be positive');
  }

  const updated = db.transaction((tx) => {
    const [existing] = tx.select().from(expenses).where(eq(expenses.id, id)).all();
    if (!existing) {
      throw new Error(`No expense found with id ${id}`);
    }

    const values: Partial<typeof expenses.$inferInsert> = {
      updatedAt: new Date().toISOString(),
    };
    if (input.amount !== undefined) values.amount = input.amount;
    if (input.categoryId !== undefined) values.categoryId = input.categoryId;
    if (input.subcategoryId !== undefined) values.subcategoryId = input.subcategoryId;
    if (input.date !== undefined) values.date = input.date;
    if (input.description !== undefined) values.description = input.description;
    if (input.tags !== undefined) values.tags = JSON.stringify(input.tags);
    if (input.receiptPhotoPath !== undefined) values.receiptPhotoPath = input.receiptPhotoPath;
    if (input.walletId !== undefined) values.walletId = input.walletId;

    const [row] = tx.update(expenses).set(values).where(eq(expenses.id, id)).returning().all();

    const finalWalletId = input.walletId !== undefined ? input.walletId : existing.walletId;
    const finalAmount = input.amount !== undefined ? input.amount : existing.amount;
    const finalDate = input.date !== undefined ? input.date : existing.date;
    const finalDescription =
      input.description !== undefined ? input.description : existing.description;

    syncWalletForExpense(
      tx,
      id,
      finalWalletId
        ? {
            walletId: finalWalletId,
            amount: finalAmount,
            date: finalDate,
            description: finalDescription,
          }
        : null
    );

    return row;
  });

  return toExpense(updated);
}

export async function deleteExpense(id: string): Promise<void> {
  db.transaction((tx) => {
    syncWalletForExpense(tx, id, null);
    tx.delete(expenses).where(eq(expenses.id, id)).run();
  });
}

export async function listExpensesByCategory(
  userId: string,
  categoryId: string
): Promise<Expense[]> {
  const rows = await db
    .select()
    .from(expenses)
    .where(
      and(
        eq(expenses.userId, userId),
        eq(expenses.categoryId, categoryId),
        isNull(expenses.recurringFrequency)
      )
    )
    .orderBy(desc(expenses.date));
  return rows.map(toExpense);
}
