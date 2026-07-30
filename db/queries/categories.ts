import { eq } from 'drizzle-orm';

import { db } from '../client';
import { categories } from '../schema';
import { DEFAULT_CATEGORIES } from '@/constants/categories';
import { generateId } from '@/utils/uuid';
import type { Category } from '@/types';

function toCategory(row: typeof categories.$inferSelect): Category {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    icon: row.icon,
    color: row.color,
    isCustom: row.isCustom,
    createdAt: row.createdAt,
  };
}

export async function listCategories(userId: string): Promise<Category[]> {
  const rows = await db.select().from(categories).where(eq(categories.userId, userId));
  return rows.map(toCategory);
}

/** Seeds the 7 pre-defined categories for a user, skipping if any already exist. */
export async function seedDefaultCategories(userId: string): Promise<number> {
  const existing = await listCategories(userId);
  if (existing.length > 0) {
    return 0;
  }

  await db.insert(categories).values(
    DEFAULT_CATEGORIES.map((category) => ({
      id: generateId(),
      userId,
      name: category.name,
      icon: category.icon,
      color: category.color,
      isCustom: false,
    }))
  );

  return DEFAULT_CATEGORIES.length;
}
