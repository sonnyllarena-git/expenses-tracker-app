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

/**
 * Brings already-seeded default categories' icon/color in line with the
 * current DEFAULT_CATEGORIES definition (e.g. after a palette rebrand),
 * without touching user-renamed/custom categories or re-seeding anything.
 */
async function syncDefaultCategoryStyles(existing: Category[]): Promise<void> {
  for (const category of existing) {
    if (category.isCustom) {
      continue;
    }
    const def = DEFAULT_CATEGORIES.find((d) => d.name === category.name);
    if (!def || (def.color === category.color && def.icon === category.icon)) {
      continue;
    }
    await db
      .update(categories)
      .set({ color: def.color, icon: def.icon })
      .where(eq(categories.id, category.id));
  }
}

/**
 * Inserts any DEFAULT_CATEGORIES entries an already-seeded account is missing
 * (matched by name) — e.g. an install seeded before "Loan Payment" existed.
 * Never touches existing rows; that's syncDefaultCategoryStyles' job.
 */
async function backfillMissingDefaultCategories(
  userId: string,
  existing: Category[]
): Promise<number> {
  const existingNames = new Set(existing.map((c) => c.name));
  const missing = DEFAULT_CATEGORIES.filter((def) => !existingNames.has(def.name));
  if (missing.length === 0) {
    return 0;
  }

  await db.insert(categories).values(
    missing.map((category) => ({
      id: generateId(),
      userId,
      name: category.name,
      icon: category.icon,
      color: category.color,
      isCustom: false,
    }))
  );

  return missing.length;
}

/** Seeds the pre-defined categories for a user, backfilling any newly-added ones otherwise. */
export async function seedDefaultCategories(userId: string): Promise<number> {
  const existing = await listCategories(userId);
  if (existing.length > 0) {
    await syncDefaultCategoryStyles(existing);
    return backfillMissingDefaultCategories(userId, existing);
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
