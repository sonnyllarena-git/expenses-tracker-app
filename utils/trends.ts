import type { Category, Expense } from '@/types';
import { weekOverWeekSpend } from '@/utils/insight';

export interface WeekTotals {
  thisWeekTotal: number;
  lastWeekTotal: number;
  /** Percent change vs. last week; null when last week had no spend to compare against. */
  pctChange: number | null;
}

/** Adds a percent-change reading on top of insight.ts's this-week/last-week window sums. */
export function weekOverWeekTotal(expenses: Expense[], today: string): WeekTotals {
  const { thisWeek, lastWeek } = weekOverWeekSpend(expenses, today);
  const pctChange = lastWeek > 0 ? ((thisWeek - lastWeek) / lastWeek) * 100 : null;
  return { thisWeekTotal: thisWeek, lastWeekTotal: lastWeek, pctChange };
}

export interface CategoryWeekTotals extends WeekTotals {
  categoryId: string;
  name: string;
}

/** Same comparison as weekOverWeekTotal, scoped to a single category. */
export function weekOverWeekForCategory(
  expenses: Expense[],
  categories: Category[],
  categoryId: string,
  today: string
): CategoryWeekTotals {
  const scoped = expenses.filter((e) => e.categoryId === categoryId);
  const totals = weekOverWeekTotal(scoped, today);
  const name = categories.find((c) => c.id === categoryId)?.name ?? 'Uncategorized';
  return { categoryId, name, ...totals };
}
