import { inArray } from 'drizzle-orm';

import { db } from '../client';
import { subcategories } from '../schema';
import { DEFAULT_SUBCATEGORIES } from '@/constants/subcategories';
import { generateId } from '@/utils/uuid';
import type { Category, Subcategory } from '@/types';

function toSubcategory(row: typeof subcategories.$inferSelect): Subcategory {
  return {
    id: row.id,
    categoryId: row.categoryId,
    name: row.name,
    isCustom: row.isCustom,
    createdAt: row.createdAt,
  };
}

/** All subcategories belonging to any of the given categories (typically a user's full category set). */
export async function listSubcategoriesByCategoryIds(categoryIds: string[]): Promise<Subcategory[]> {
  if (categoryIds.length === 0) {
    return [];
  }
  const rows = await db
    .select()
    .from(subcategories)
    .where(inArray(subcategories.categoryId, categoryIds));
  return rows.map(toSubcategory);
}

/**
 * Inserts any DEFAULT_SUBCATEGORIES entries a category is missing (matched by
 * category + name), same backfill idiom as
 * db/queries/categories.ts's backfillMissingDefaultCategories — safe to call
 * on every load, never touches existing rows (default or custom).
 */
export async function seedDefaultSubcategories(categories: Category[]): Promise<number> {
  const categoryIds = categories.map((c) => c.id);
  const existing = await listSubcategoriesByCategoryIds(categoryIds);
  const existingKeys = new Set(
    existing.map((s) => `${s.categoryId}::${s.name.toLowerCase()}`)
  );

  const toInsert: (typeof subcategories.$inferInsert)[] = [];
  for (const category of categories) {
    const defaults = DEFAULT_SUBCATEGORIES[category.name];
    if (!defaults) {
      continue;
    }
    for (const name of defaults) {
      if (!existingKeys.has(`${category.id}::${name.toLowerCase()}`)) {
        toInsert.push({ id: generateId(), categoryId: category.id, name, isCustom: false });
      }
    }
  }

  if (toInsert.length === 0) {
    return 0;
  }

  await db.insert(subcategories).values(toInsert);
  return toInsert.length;
}

export interface NewSubcategoryInput {
  categoryId: string;
  name: string;
}

export async function insertCustomSubcategory(input: NewSubcategoryInput): Promise<Subcategory> {
  const [row] = await db
    .insert(subcategories)
    .values({ id: generateId(), categoryId: input.categoryId, name: input.name, isCustom: true })
    .returning();
  return toSubcategory(row);
}
