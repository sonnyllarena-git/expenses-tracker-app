import { and, desc, eq } from 'drizzle-orm';

import { db } from '../client';
import { expenses } from '../schema';
import { generateId } from '@/utils/uuid';
import type { Expense, RecurringFrequency } from '@/types';

function toExpense(row: typeof expenses.$inferSelect): Expense {
  return {
    id: row.id,
    userId: row.userId,
    addedByUserId: row.addedByUserId,
    amount: row.amount,
    categoryId: row.categoryId,
    date: row.date,
    description: row.description,
    tags: JSON.parse(row.tags) as string[],
    receiptPhotoPath: row.receiptPhotoPath,
    isRecurring: row.isRecurring,
    recurringFrequency: row.recurringFrequency as RecurringFrequency | null,
    recurringTemplateId: row.recurringTemplateId,
    budgetId: row.budgetId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export interface NewExpenseInput {
  userId: string;
  addedByUserId?: string | null;
  amount: number;
  categoryId: string;
  date: string;
  description?: string;
  tags?: string[];
  receiptPhotoPath?: string | null;
}

export async function listExpenses(userId: string): Promise<Expense[]> {
  const rows = await db
    .select()
    .from(expenses)
    .where(eq(expenses.userId, userId))
    .orderBy(desc(expenses.date));
  return rows.map(toExpense);
}

/** One-off (non-recurring) expense insert. Recurring-template creation lands in Weeks 2-4. */
export async function insertExpense(input: NewExpenseInput): Promise<Expense> {
  if (input.amount <= 0) {
    throw new Error('Expense amount must be positive');
  }

  const [created] = await db
    .insert(expenses)
    .values({
      id: generateId(),
      userId: input.userId,
      addedByUserId: input.addedByUserId ?? null,
      amount: input.amount,
      categoryId: input.categoryId,
      date: input.date,
      description: input.description ?? '',
      tags: JSON.stringify(input.tags ?? []),
      receiptPhotoPath: input.receiptPhotoPath ?? null,
      isRecurring: false,
    })
    .returning();

  return toExpense(created);
}

export interface UpdateExpenseInput {
  amount?: number;
  categoryId?: string;
  date?: string;
  description?: string;
  tags?: string[];
  receiptPhotoPath?: string | null;
}

export async function updateExpense(id: string, input: UpdateExpenseInput): Promise<Expense> {
  if (input.amount !== undefined && input.amount <= 0) {
    throw new Error('Expense amount must be positive');
  }

  const values: Partial<typeof expenses.$inferInsert> = {
    updatedAt: new Date().toISOString(),
  };
  if (input.amount !== undefined) values.amount = input.amount;
  if (input.categoryId !== undefined) values.categoryId = input.categoryId;
  if (input.date !== undefined) values.date = input.date;
  if (input.description !== undefined) values.description = input.description;
  if (input.tags !== undefined) values.tags = JSON.stringify(input.tags);
  if (input.receiptPhotoPath !== undefined) values.receiptPhotoPath = input.receiptPhotoPath;

  const [updated] = await db.update(expenses).set(values).where(eq(expenses.id, id)).returning();

  if (!updated) {
    throw new Error(`No expense found with id ${id}`);
  }

  return toExpense(updated);
}

export async function deleteExpense(id: string): Promise<void> {
  await db.delete(expenses).where(eq(expenses.id, id));
}

export async function listExpensesByCategory(
  userId: string,
  categoryId: string
): Promise<Expense[]> {
  const rows = await db
    .select()
    .from(expenses)
    .where(and(eq(expenses.userId, userId), eq(expenses.categoryId, categoryId)))
    .orderBy(desc(expenses.date));
  return rows.map(toExpense);
}
