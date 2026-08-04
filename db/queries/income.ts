import { desc, eq } from 'drizzle-orm';

import { db } from '../client';
import { income } from '../schema';
import { generateId } from '@/utils/uuid';
import type { Income, RecurringFrequency } from '@/types';

function toIncome(row: typeof income.$inferSelect): Income {
  return {
    id: row.id,
    userId: row.userId,
    amount: row.amount,
    source: row.source,
    date: row.date,
    isRecurring: row.isRecurring,
    recurringFrequency: row.recurringFrequency as RecurringFrequency | null,
    createdAt: row.createdAt,
  };
}

export interface NewIncomeInput {
  userId: string;
  amount: number;
  source?: string;
  date: string;
  isRecurring?: boolean;
  recurringFrequency?: RecurringFrequency | null;
}

export async function listIncome(userId: string): Promise<Income[]> {
  const rows = await db
    .select()
    .from(income)
    .where(eq(income.userId, userId))
    .orderBy(desc(income.date));
  return rows.map(toIncome);
}

export async function insertIncome(input: NewIncomeInput): Promise<Income> {
  if (input.amount <= 0) {
    throw new Error('Income amount must be positive');
  }

  const [created] = await db
    .insert(income)
    .values({
      id: generateId(),
      userId: input.userId,
      amount: input.amount,
      source: input.source ?? '',
      date: input.date,
      isRecurring: input.isRecurring ?? false,
      recurringFrequency: input.recurringFrequency ?? null,
    })
    .returning();

  return toIncome(created);
}

export interface UpdateIncomeInput {
  amount?: number;
  source?: string;
  date?: string;
  isRecurring?: boolean;
  recurringFrequency?: RecurringFrequency | null;
}

export async function updateIncome(id: string, input: UpdateIncomeInput): Promise<Income> {
  if (input.amount !== undefined && input.amount <= 0) {
    throw new Error('Income amount must be positive');
  }

  const values: Partial<typeof income.$inferInsert> = {};
  if (input.amount !== undefined) values.amount = input.amount;
  if (input.source !== undefined) values.source = input.source;
  if (input.date !== undefined) values.date = input.date;
  if (input.isRecurring !== undefined) values.isRecurring = input.isRecurring;
  if (input.recurringFrequency !== undefined) values.recurringFrequency = input.recurringFrequency;

  const [updated] = await db.update(income).set(values).where(eq(income.id, id)).returning();

  if (!updated) {
    throw new Error(`No income found with id ${id}`);
  }

  return toIncome(updated);
}

export async function deleteIncome(id: string): Promise<void> {
  await db.delete(income).where(eq(income.id, id));
}
