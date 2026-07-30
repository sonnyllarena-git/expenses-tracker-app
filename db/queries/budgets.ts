import { eq } from 'drizzle-orm';

import { db } from '../client';
import { budgets } from '../schema';
import type { Budget } from '@/types';

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
