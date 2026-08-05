import { mostOverBudgetCategory, pickDashboardInsight, weekOverWeekSpend } from '../insight';
import type { Budget, Category, Expense } from '@/types';

function makeExpense(overrides: Partial<Expense>): Expense {
  return {
    id: 'expense-id',
    userId: 'user-1',
    addedByUserId: null,
    amount: 100,
    categoryId: 'cat-food',
    date: '2026-08-01',
    description: '',
    tags: [],
    receiptPhotoPath: null,
    isRecurring: false,
    recurringFrequency: null,
    recurringTemplateId: null,
    budgetId: null,
    walletId: null,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeBudget(overrides: Partial<Budget>): Budget {
  return {
    id: 'budget-id',
    userId: 'user-1',
    categoryId: 'cat-food',
    limitAmount: 1000,
    month: '2026-08',
    alertThreshold: 0.8,
    createdAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

const categories: Category[] = [
  {
    id: 'cat-food',
    userId: 'user-1',
    name: 'Food',
    icon: 'fast-food',
    color: '#2D7F4A',
    isCustom: false,
    createdAt: '2026-08-01T00:00:00.000Z',
  },
];

describe('mostOverBudgetCategory', () => {
  it('returns null when nothing has reached its alert threshold', () => {
    const budgets = [makeBudget({ limitAmount: 1000, alertThreshold: 0.8 })];
    const expenses = [makeExpense({ amount: 500, date: '2026-08-01' })];
    expect(mostOverBudgetCategory(budgets, expenses, categories, '2026-08')).toBeNull();
  });

  it('reports the category name and rounded-friendly percentage once over threshold', () => {
    const budgets = [makeBudget({ limitAmount: 1000, alertThreshold: 0.8 })];
    const expenses = [makeExpense({ amount: 900, date: '2026-08-01' })];
    expect(mostOverBudgetCategory(budgets, expenses, categories, '2026-08')).toEqual({
      categoryName: 'Food',
      percentUsed: 90,
    });
  });

  it('ignores budgets from other months', () => {
    const budgets = [makeBudget({ month: '2026-07', limitAmount: 100, alertThreshold: 0.5 })];
    const expenses = [makeExpense({ amount: 999, date: '2026-07-01' })];
    expect(mostOverBudgetCategory(budgets, expenses, categories, '2026-08')).toBeNull();
  });
});

describe('weekOverWeekSpend', () => {
  it('sums the 7 days ending on today vs. the 7 days before that', () => {
    const expenses = [
      makeExpense({ amount: 800, date: '2026-08-12' }), // this week (offset 3)
      makeExpense({ amount: 500, date: '2026-08-05' }), // last week (offset 10)
      makeExpense({ amount: 999, date: '2026-07-01' }), // outside both windows
    ];
    expect(weekOverWeekSpend(expenses, '2026-08-15')).toEqual({ thisWeek: 800, lastWeek: 500 });
  });
});

describe('pickDashboardInsight', () => {
  it('highlights the top category when nothing more urgent applies', () => {
    const expenses = [makeExpense({ amount: 3000, date: '2026-08-05' })];
    const message = pickDashboardInsight({
      expenses,
      categories,
      budgets: [],
      monthNet: -3000,
      month: '2026-08',
      today: '2026-08-05',
      daysUntilPayday: null,
      currency: 'PHP',
    });
    expect(message).toBe('Food is leading your month at ₱3,000.00.');
  });

  it('prioritizes a budget-threshold alert over the top-category message', () => {
    const budgets = [makeBudget({ limitAmount: 1000, alertThreshold: 0.8 })];
    const expenses = [makeExpense({ amount: 900, date: '2026-08-01' })];
    const message = pickDashboardInsight({
      expenses,
      categories,
      budgets,
      monthNet: -900,
      month: '2026-08',
      today: '2026-08-01',
      daysUntilPayday: null,
      currency: 'PHP',
    });
    expect(message).toBe('Budget alert: Food is at 90% this month.');
  });

  it('prioritizes a worsening week-over-week trend over the top-category message', () => {
    const expenses = [
      makeExpense({ amount: 800, date: '2026-08-12' }),
      makeExpense({ amount: 500, date: '2026-08-05' }),
    ];
    const message = pickDashboardInsight({
      expenses,
      categories,
      budgets: [],
      monthNet: -1300,
      month: '2026-08',
      today: '2026-08-15',
      daysUntilPayday: null,
      currency: 'PHP',
    });
    expect(message).toBe("You've spent ₱300.00 more than last week. Watch the trend.");
  });

  it('mentions the amount left before payday when there is no expense data yet', () => {
    const message = pickDashboardInsight({
      expenses: [],
      categories,
      budgets: [],
      monthNet: 200,
      month: '2026-08',
      today: '2026-08-01',
      daysUntilPayday: 5,
      currency: 'PHP',
    });
    expect(message).toBe("₱200.00 left before payday. You've got this.");
  });

  it('congratulates being under the total budget when there is no spend yet', () => {
    const budgets = [makeBudget({ limitAmount: 1000, alertThreshold: 0.8 })];
    const message = pickDashboardInsight({
      expenses: [],
      categories,
      budgets,
      monthNet: 0,
      month: '2026-08',
      today: '2026-08-01',
      daysUntilPayday: null,
      currency: 'PHP',
    });
    expect(message).toBe("Great month so far — you're ₱1,000.00 under your total budget.");
  });

  it('falls back to a generic tip when there is no data at all', () => {
    const message = pickDashboardInsight({
      expenses: [],
      categories,
      budgets: [],
      monthNet: 0,
      month: '2026-08',
      today: '2026-08-01',
      daysUntilPayday: null,
      currency: 'PHP',
    });
    expect(message).toBe('Add an expense to start seeing personalized insights here.');
  });
});
