import type { Budget, Expense } from '@/types';

export type BudgetMood = 'happy' | 'neutral' | 'sad';

/** Sum of a single category's spend within the given month. */
export function spentForCategory(expenses: Expense[], categoryId: string, month: string): number {
  return expenses
    .filter((e) => e.categoryId === categoryId && e.date.startsWith(month))
    .reduce((sum, e) => sum + e.amount, 0);
}

/**
 * Overall fraction of this month's total budget spent, summed across every
 * budgeted category. Null when there are no budgets for the month (nothing
 * to measure against).
 */
export function overallBudgetUsage(
  budgets: Budget[],
  expenses: Expense[],
  month: string
): number | null {
  const monthBudgets = budgets.filter((b) => b.month === month);
  const totalLimit = monthBudgets.reduce((sum, b) => sum + b.limitAmount, 0);
  if (monthBudgets.length === 0 || totalLimit <= 0) {
    return null;
  }

  const totalActual = monthBudgets.reduce(
    (sum, b) => sum + spentForCategory(expenses, b.categoryId, month),
    0
  );
  return totalActual / totalLimit;
}

/** happy <50%, neutral 50-80%, sad >80%. No budgets set at all -> happy. */
export function moodFromUsage(usage: number | null): BudgetMood {
  if (usage === null) {
    return 'happy';
  }
  if (usage > 0.8) {
    return 'sad';
  }
  if (usage >= 0.5) {
    return 'neutral';
  }
  return 'happy';
}

/** True if any single budgeted category has reached its own alert threshold this month. */
export function hasOverThresholdBudget(
  budgets: Budget[],
  expenses: Expense[],
  month: string
): boolean {
  return budgets
    .filter((b) => b.month === month && b.limitAmount > 0)
    .some(
      (b) => spentForCategory(expenses, b.categoryId, month) / b.limitAmount >= b.alertThreshold
    );
}
