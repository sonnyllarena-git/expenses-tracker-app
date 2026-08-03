import { eq } from 'drizzle-orm';

import { db } from '../client';
import { budgets } from '../schema';
import { generateId } from '@/utils/uuid';
import type { Budget } from '@/types';

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

function toBudget(row: typeof budgets.$inferSelect): Budget {
  return {
    id: row.id,
    userId: row.userId,
    categoryId: row.categoryId,
    limitAmount: row.limitAmount,
    month: row.month,
    alertThreshold: row.alertThreshold,
    createdAt: row.createdAt,
  };
}

export async function listBudgets(userId: string): Promise<Budget[]> {
  const rows = await db.select().from(budgets).where(eq(budgets.userId, userId));
  return rows.map(toBudget);
}

export interface NewBudgetInput {
  userId: string;
  categoryId: string;
  limitAmount: number;
  month: string;
  alertThreshold?: number;
}

/** Creates a budget for a category/month. Re-parenting to a different category or
 * month isn't supported — delete and re-add instead (see `updateBudget`). */
export async function insertBudget(input: NewBudgetInput): Promise<Budget> {
  if (input.limitAmount <= 0) {
    throw new Error('Budget limit must be positive');
  }
  if (!MONTH_PATTERN.test(input.month)) {
    throw new Error('Budget month must be in YYYY-MM format');
  }

  const [created] = await db
    .insert(budgets)
    .values({
      id: generateId(),
      userId: input.userId,
      categoryId: input.categoryId,
      limitAmount: input.limitAmount,
      month: input.month,
      alertThreshold: input.alertThreshold ?? 0.8,
    })
    .returning();

  return toBudget(created);
}

export interface UpdateBudgetInput {
  limitAmount?: number;
  alertThreshold?: number;
}

export async function updateBudget(id: string, input: UpdateBudgetInput): Promise<Budget> {
  if (input.limitAmount !== undefined && input.limitAmount <= 0) {
    throw new Error('Budget limit must be positive');
  }

  const values: Partial<typeof budgets.$inferInsert> = {};
  if (input.limitAmount !== undefined) values.limitAmount = input.limitAmount;
  if (input.alertThreshold !== undefined) values.alertThreshold = input.alertThreshold;

  const [updated] = await db.update(budgets).set(values).where(eq(budgets.id, id)).returning();

  if (!updated) {
    throw new Error(`No budget found with id ${id}`);
  }

  return toBudget(updated);
}

export async function deleteBudget(id: string): Promise<void> {
  await db.delete(budgets).where(eq(budgets.id, id));
}
