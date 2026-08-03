import type { Expense, RecurringFrequency } from '@/types';
import { nextOccurrenceDate } from '@/utils/date';

export interface RecurringStatus {
  lastMaterializedDate: string | null;
  nextDueDate: string;
}

/**
 * Client-side mirror of materializeRecurring's "where was I up to" logic, for
 * display only — reads from the already-loaded expenses list rather than
 * re-querying the database.
 */
export function recurringStatus(template: Expense, expenses: Expense[]): RecurringStatus {
  const instances = expenses.filter((e) => e.recurringTemplateId === template.id);

  const lastMaterializedDate =
    instances.length > 0
      ? instances.reduce((latest, e) => (e.date > latest ? e.date : latest), instances[0].date)
      : null;

  const frequency = template.recurringFrequency as RecurringFrequency;
  const nextDueDate = lastMaterializedDate
    ? nextOccurrenceDate(lastMaterializedDate, frequency)
    : template.date;

  return { lastMaterializedDate, nextDueDate };
}
