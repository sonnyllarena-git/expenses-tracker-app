import type { Budget, Category, Expense } from '@/types';
import { daysInMonth } from '@/utils/date';

export interface CategorySlice {
  categoryId: string;
  name: string;
  color: string;
  value: number;
}

/** Sums the given month's expenses per category, sorted descending by amount. */
export function groupExpensesByCategory(
  expenses: Expense[],
  categories: Category[],
  month: string
): CategorySlice[] {
  const totals = new Map<string, number>();
  for (const expense of expenses) {
    if (!expense.date.startsWith(month)) {
      continue;
    }
    totals.set(expense.categoryId, (totals.get(expense.categoryId) ?? 0) + expense.amount);
  }

  const slices: CategorySlice[] = [];
  for (const [categoryId, value] of totals) {
    if (value <= 0) {
      continue;
    }
    const category = categories.find((c) => c.id === categoryId);
    slices.push({
      categoryId,
      name: category?.name ?? 'Uncategorized',
      color: category?.color ?? '#999',
      value,
    });
  }

  return slices.sort((a, b) => b.value - a.value);
}

export interface DailySpendPoint {
  day: number;
  label: string;
  value: number;
}

/** One point per day of the given month (zero-filled), regardless of today's date. */
export function groupExpensesByDay(expenses: Expense[], month: string): DailySpendPoint[] {
  const totals = new Map<number, number>();
  for (const expense of expenses) {
    if (!expense.date.startsWith(month)) {
      continue;
    }
    const day = Number(expense.date.slice(8, 10));
    totals.set(day, (totals.get(day) ?? 0) + expense.amount);
  }

  const lastDay = daysInMonth(month);
  const points: DailySpendPoint[] = [];
  for (let day = 1; day <= lastDay; day++) {
    points.push({
      day,
      label: day === 1 || day % 5 === 0 ? String(day) : '',
      value: totals.get(day) ?? 0,
    });
  }
  return points;
}

export interface WeeklySpendPoint {
  label: string;
  value: number;
}

/** Sums the given month's expenses into consecutive 7-day chunks starting on day 1. */
export function groupExpensesByWeek(expenses: Expense[], month: string): WeeklySpendPoint[] {
  const [year, monthNum] = month.split('-').map(Number);
  const lastDay = daysInMonth(month);
  const points: WeeklySpendPoint[] = [];

  for (let start = 1; start <= lastDay; start += 7) {
    const end = Math.min(start + 6, lastDay);
    const value = expenses
      .filter((e) => {
        if (!e.date.startsWith(month)) {
          return false;
        }
        const day = Number(e.date.slice(8, 10));
        return day >= start && day <= end;
      })
      .reduce((sum, e) => sum + e.amount, 0);

    const monthAbbrev = new Date(year, monthNum - 1, start).toLocaleDateString('en-US', {
      month: 'short',
    });
    points.push({ label: `${monthAbbrev} ${start}-${end}`, value });
  }

  return points;
}

export interface BudgetVsActualRow {
  budget: Budget;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  actual: number;
  remaining: number;
  isOverLimit: boolean;
}

/** Pairs each of the given month's budgets with actual spend in that category/month. */
export function budgetVsActual(
  budgets: Budget[],
  expenses: Expense[],
  categories: Category[],
  month: string
): BudgetVsActualRow[] {
  return budgets
    .filter((budget) => budget.month === month)
    .map((budget) => {
      const actual = expenses
        .filter((e) => e.categoryId === budget.categoryId && e.date.startsWith(month))
        .reduce((sum, e) => sum + e.amount, 0);
      const category = categories.find((c) => c.id === budget.categoryId);

      return {
        budget,
        categoryName: category?.name ?? 'Uncategorized',
        categoryColor: category?.color ?? '#999',
        categoryIcon: category?.icon ?? 'help-circle',
        actual,
        remaining: budget.limitAmount - actual,
        isOverLimit: actual > budget.limitAmount,
      };
    });
}
