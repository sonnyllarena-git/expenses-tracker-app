import { theme } from '@/theme';
import type { Category, Expense, Income } from '@/types';
import { recurringStatus } from '@/utils/recurring';

export interface DailySpendBar {
  label: string;
  value: number;
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Sums expenses per day for the 7 days ending on `today` (inclusive), oldest first. */
export function last7DaysSpend(expenses: Expense[], today: string): DailySpendBar[] {
  const [year, month, day] = today.split('-').map(Number);
  const anchor = new Date(year, month - 1, day);

  const bars: DailySpendBar[] = [];
  for (let offset = 6; offset >= 0; offset--) {
    const d = new Date(anchor);
    d.setDate(anchor.getDate() - offset);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
    const value = expenses.filter((e) => e.date === iso).reduce((sum, e) => sum + e.amount, 0);
    bars.push({ label: WEEKDAY_LABELS[d.getDay()], value });
  }
  return bars;
}

export interface UpcomingExpense {
  templateId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  dueDate: string;
  amount: number;
  daysLeft: number;
}

/** Active recurring templates due within `withinDays` of `today`, soonest first. */
export function upcomingRecurringExpenses(
  templates: Expense[],
  expenses: Expense[],
  categories: Category[],
  today: string,
  withinDays: number
): UpcomingExpense[] {
  const [y, m, d] = today.split('-').map(Number);
  const todayDate = new Date(y, m - 1, d);

  const upcoming: UpcomingExpense[] = [];
  for (const template of templates) {
    if (!template.isRecurring) {
      continue;
    }

    const { nextDueDate } = recurringStatus(template, expenses);
    const [dy, dm, dd] = nextDueDate.split('-').map(Number);
    const daysLeft = Math.round(
      (new Date(dy, dm - 1, dd).getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysLeft < 0 || daysLeft > withinDays) {
      continue;
    }

    const category = categories.find((c) => c.id === template.categoryId);
    upcoming.push({
      templateId: template.id,
      categoryName: category?.name ?? 'Uncategorized',
      categoryIcon: category?.icon ?? 'help-circle',
      categoryColor: category?.color ?? theme.categoryFallback,
      dueDate: nextDueDate,
      amount: template.amount,
      daysLeft,
    });
  }

  return upcoming.sort((a, b) => a.daysLeft - b.daysLeft);
}

export interface MonthIncomeVsExpenses {
  totalIncome: number;
  totalExpenses: number;
  net: number;
}

/** Sums this month's income and expenses (independently of each other) plus their net. */
export function monthIncomeVsExpenses(
  income: Income[],
  expenses: Expense[],
  month: string
): MonthIncomeVsExpenses {
  const totalIncome = income
    .filter((i) => i.date.startsWith(month))
    .reduce((sum, i) => sum + i.amount, 0);
  const totalExpenses = expenses
    .filter((e) => e.date.startsWith(month))
    .reduce((sum, e) => sum + e.amount, 0);
  return { totalIncome, totalExpenses, net: totalIncome - totalExpenses };
}
