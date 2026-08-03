import { eq } from 'drizzle-orm';

import { db } from '../client';
import { budgets, categories, expenses, familyMembers } from '../schema';
import { seedDefaultCategories } from './categories';

/**
 * Wipes all expense/budget/category data for an account and re-seeds the 7
 * default categories, leaving the `users` row (and its settings) untouched.
 */
export async function deleteAllData(userId: string): Promise<void> {
  await db.delete(expenses).where(eq(expenses.userId, userId));
  await db.delete(budgets).where(eq(budgets.userId, userId));
  await db.delete(familyMembers).where(eq(familyMembers.userId, userId));
  await db.delete(categories).where(eq(categories.userId, userId));
  await seedDefaultCategories(userId);
}
