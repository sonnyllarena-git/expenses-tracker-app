import type { Budget, Category, Expense } from '@/types';
import { overallBudgetUsage, spentForCategory } from '@/utils/budget';
import { formatCurrency } from '@/utils/currency';
import { groupExpensesByCategory } from '@/utils/reports';

export interface BudgetAlertSignal {
  categoryName: string;
  percentUsed: number;
}

/**
 * The worst-offending budgeted category this month — the highest usage ratio
 * among categories that have reached their own alert threshold — or null if
 * none qualify.
 */
export function mostOverBudgetCategory(
  budgets: Budget[],
  expenses: Expense[],
  categories: Category[],
  month: string
): BudgetAlertSignal | null {
  let worst: BudgetAlertSignal | null = null;
  let worstRatio = 0;

  for (const budget of budgets) {
    if (budget.month !== month || budget.limitAmount <= 0) {
      continue;
    }
    const ratio = spentForCategory(expenses, budget.categoryId, month) / budget.limitAmount;
    if (ratio >= budget.alertThreshold && ratio > worstRatio) {
      worstRatio = ratio;
      const category = categories.find((c) => c.id === budget.categoryId);
      worst = { categoryName: category?.name ?? 'A category', percentUsed: ratio * 100 };
    }
  }

  return worst;
}

export interface WeekOverWeek {
  thisWeek: number;
  lastWeek: number;
}

/** Sums the 7 days ending on `today` (inclusive) vs. the 7 days immediately before that. */
export function weekOverWeekSpend(expenses: Expense[], today: string): WeekOverWeek {
  const [year, month, day] = today.split('-').map(Number);
  const anchor = new Date(year, month - 1, day);

  function sumWindow(startOffset: number, endOffset: number): number {
    let sum = 0;
    for (let offset = startOffset; offset <= endOffset; offset++) {
      const d = new Date(anchor);
      d.setDate(anchor.getDate() - offset);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;
      sum += expenses.filter((e) => e.date === iso).reduce((s, e) => s + e.amount, 0);
    }
    return sum;
  }

  return { thisWeek: sumWindow(0, 6), lastWeek: sumWindow(7, 13) };
}

/** Total (limit - actual) summed across this month's budgeted categories, or null if none. */
export function totalBudgetRemaining(
  budgets: Budget[],
  expenses: Expense[],
  month: string
): number | null {
  const monthBudgets = budgets.filter((b) => b.month === month);
  if (monthBudgets.length === 0) {
    return null;
  }
  const totalLimit = monthBudgets.reduce((sum, b) => sum + b.limitAmount, 0);
  const totalActual = monthBudgets.reduce(
    (sum, b) => sum + spentForCategory(expenses, b.categoryId, month),
    0
  );
  return totalLimit - totalActual;
}

export interface DashboardInsightInput {
  expenses: Expense[];
  categories: Category[];
  budgets: Budget[];
  /** This month's income minus expenses (from monthIncomeVsExpenses). */
  monthNet: number;
  month: string;
  today: string;
  daysUntilPayday: number | null;
  currency: string;
}

/**
 * Picks the single most relevant dashboard speech-bubble insight, in priority
 * order: an over-threshold budget warning, a worsening week-over-week trend
 * (only when there's an actual prior week to compare against), this month's
 * top-spending category, how much is left before payday, an under-budget
 * pat-on-the-back, and finally a generic fallback for a brand-new account
 * with no data yet.
 */
export function pickDashboardInsight(input: DashboardInsightInput): string {
  const { expenses, categories, budgets, monthNet, month, today, daysUntilPayday, currency } =
    input;

  const budgetAlert = mostOverBudgetCategory(budgets, expenses, categories, month);
  if (budgetAlert) {
    return `Budget alert: ${budgetAlert.categoryName} is at ${Math.round(budgetAlert.percentUsed)}% this month.`;
  }

  const { thisWeek, lastWeek } = weekOverWeekSpend(expenses, today);
  if (lastWeek > 0 && thisWeek > lastWeek) {
    return `You've spent ${formatCurrency(thisWeek - lastWeek, currency)} more than last week. Watch the trend.`;
  }

  const topCategory = groupExpensesByCategory(expenses, categories, month)[0];
  if (topCategory) {
    const usage = overallBudgetUsage(budgets, expenses, month);
    const suffix = usage !== null && usage < 1 ? ' — still under budget though!' : '.';
    return `${topCategory.name} is leading your month at ${formatCurrency(topCategory.value, currency)}${suffix}`;
  }

  if (daysUntilPayday !== null && monthNet > 0) {
    return `${formatCurrency(monthNet, currency)} left before payday. You've got this.`;
  }

  const remaining = totalBudgetRemaining(budgets, expenses, month);
  if (remaining !== null && remaining > 0) {
    return `Great month so far — you're ${formatCurrency(remaining, currency)} under your total budget.`;
  }

  return 'Add an expense to start seeing personalized insights here.';
}
