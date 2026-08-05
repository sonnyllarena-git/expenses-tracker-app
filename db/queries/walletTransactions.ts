import { desc, eq } from 'drizzle-orm';

import { db } from '../client';
import { walletTransactions } from '../schema';
import { generateId } from '@/utils/uuid';
import type { WalletTransaction, WalletTransactionType } from '@/types';

export function toWalletTransaction(
  row: typeof walletTransactions.$inferSelect
): WalletTransaction {
  return {
    id: row.id,
    walletId: row.walletId,
    expenseId: row.expenseId,
    amount: row.amount,
    type: row.type as WalletTransactionType,
    description: row.description,
    date: row.date,
    createdAt: row.createdAt,
  };
}

export interface NewWalletTransactionInput {
  walletId: string;
  expenseId?: string | null;
  amount: number;
  type: WalletTransactionType;
  description?: string;
  date: string;
}

/**
 * Standalone insert for manual balance adjustments made directly from the
 * Wallet tab. Expense-linked transactions are created atomically alongside
 * the expense write instead — see db/queries/expenses.ts.
 */
export async function insertWalletTransaction(
  input: NewWalletTransactionInput
): Promise<WalletTransaction> {
  const [created] = await db
    .insert(walletTransactions)
    .values({
      id: generateId(),
      walletId: input.walletId,
      expenseId: input.expenseId ?? null,
      amount: input.amount,
      type: input.type,
      description: input.description ?? '',
      date: input.date,
    })
    .returning();

  return toWalletTransaction(created);
}

/** Most recent first. */
export async function listWalletTransactions(walletId: string): Promise<WalletTransaction[]> {
  const rows = await db
    .select()
    .from(walletTransactions)
    .where(eq(walletTransactions.walletId, walletId))
    .orderBy(desc(walletTransactions.date), desc(walletTransactions.createdAt));
  return rows.map(toWalletTransaction);
}

export async function deleteWalletTransactionsByExpenseId(expenseId: string): Promise<void> {
  await db.delete(walletTransactions).where(eq(walletTransactions.expenseId, expenseId));
}
