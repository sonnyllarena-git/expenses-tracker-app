import { and, desc, eq, isNotNull, isNull } from 'drizzle-orm';

import { db } from '../client';
import { expenses } from '../schema';
import { generateId } from '@/utils/uuid';
import { nextOccurrenceDate } from '@/utils/date';
import type { Expense, RecurringFrequency } from '@/types';

function toExpense(row: typeof expenses.$inferSelect): Expense {
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

export interface NewRecurringInput {
  userId: string;
  amount: number;
  categoryId: string;
  description?: string;
  frequency: RecurringFrequency;
  startDate: string;
}

/**
 * Creates a recurring template: an `expenses` row with `isRecurring = true`,
 * `recurringFrequency` set, and no `recurringTemplateId` (per DATABASE_SCHEMA.md's
 * recurring-expense design). Materialized occurrences are separate expense rows
 * created by materializeRecurring, each pointing back at this template's id.
 */
export async function createRecurringTemplate(input: NewRecurringInput): Promise<Expense> {
  if (input.amount <= 0) {
    throw new Error('Recurring amount must be positive');
  }

  const [created] = await db
    .insert(expenses)
    .values({
      id: generateId(),
      userId: input.userId,
      amount: input.amount,
      categoryId: input.categoryId,
      date: input.startDate,
      description: input.description ?? '',
      tags: JSON.stringify([]),
      isRecurring: true,
      recurringFrequency: input.frequency,
    })
    .returning();

  return toExpense(created);
}

/** All recurring templates (active and paused) for the account. */
export async function listRecurringTemplates(userId: string): Promise<Expense[]> {
  const rows = await db
    .select()
    .from(expenses)
    .where(
      and(
        eq(expenses.userId, userId),
        isNotNull(expenses.recurringFrequency),
        isNull(expenses.recurringTemplateId)
      )
    )
    .orderBy(desc(expenses.createdAt));
  return rows.map(toExpense);
}

export interface UpdateRecurringInput {
  amount?: number;
  categoryId?: string;
  description?: string;
  frequency?: RecurringFrequency;
  /** Maps to the `isRecurring` column: true = active, false = paused. */
  isActive?: boolean;
}

/** Start date is intentionally not editable — re-dating a template would make its
 * last-materialized/next-due math ambiguous. Delete and re-create instead. */
export async function updateRecurringTemplate(
  id: string,
  input: UpdateRecurringInput
): Promise<Expense> {
  if (input.amount !== undefined && input.amount <= 0) {
    throw new Error('Recurring amount must be positive');
  }

  const values: Partial<typeof expenses.$inferInsert> = {
    updatedAt: new Date().toISOString(),
  };
  if (input.amount !== undefined) values.amount = input.amount;
  if (input.categoryId !== undefined) values.categoryId = input.categoryId;
  if (input.description !== undefined) values.description = input.description;
  if (input.frequency !== undefined) values.recurringFrequency = input.frequency;
  if (input.isActive !== undefined) values.isRecurring = input.isActive;

  const [updated] = await db.update(expenses).set(values).where(eq(expenses.id, id)).returning();

  if (!updated) {
    throw new Error(`No recurring template found with id ${id}`);
  }

  return toExpense(updated);
}

/** Deletes the template only — previously materialized expense rows are kept. */
export async function deleteRecurringTemplate(id: string): Promise<void> {
  await db.delete(expenses).where(eq(expenses.id, id));
}

/**
 * For every active template, materializes any occurrence whose due date has
 * arrived (<= `today`), advancing from its last materialized instance (or its
 * start date, if none exist yet). Returns the number of rows created.
 */
export async function materializeRecurring(userId: string, today: string): Promise<number> {
  const templates = await db
    .select()
    .from(expenses)
    .where(
      and(
        eq(expenses.userId, userId),
        eq(expenses.isRecurring, true),
        isNotNull(expenses.recurringFrequency),
        isNull(expenses.recurringTemplateId)
      )
    );

  let createdCount = 0;

  for (const template of templates) {
    const frequency = template.recurringFrequency as RecurringFrequency;
    const instances = await db
      .select()
      .from(expenses)
      .where(eq(expenses.recurringTemplateId, template.id));

    // Tracking every existing instance date (not just the latest) makes this
    // safe to call more than once for the same launch — e.g. React
    // double-invoking an effect in development — since a repeat call will
    // see dates the first call already inserted and skip them.
    const existingDates = new Set(instances.map((i) => i.date));
    const lastDate = instances.reduce<string | null>(
      (latest, i) => (latest === null || i.date > latest ? i.date : latest),
      null
    );

    let nextDue = lastDate ? nextOccurrenceDate(lastDate, frequency) : template.date;

    // Safety cap: a year of daily occurrences is far more than one launch
    // should ever need to catch up, and guards against bad frequency data.
    let safety = 0;
    while (nextDue <= today && safety < 366) {
      if (!existingDates.has(nextDue)) {
        await db.insert(expenses).values({
          id: generateId(),
          userId,
          amount: template.amount,
          categoryId: template.categoryId,
          subcategoryId: template.subcategoryId,
          date: nextDue,
          description: template.description,
          tags: template.tags,
          isRecurring: false,
          recurringTemplateId: template.id,
        });
        existingDates.add(nextDue);
        createdCount += 1;
      }
      nextDue = nextOccurrenceDate(nextDue, frequency);
      safety += 1;
    }
  }

  return createdCount;
}
