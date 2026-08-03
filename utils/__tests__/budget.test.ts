import { hasOverThresholdBudget, moodFromUsage, overallBudgetUsage } from '../budget';
import type { Budget, Expense } from '@/types';

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

describe('overallBudgetUsage', () => {
  it('returns null when there are no budgets for the month', () => {
    expect(overallBudgetUsage([], [], '2026-08')).toBeNull();
  });

  it('sums actual spend across budgeted categories and divides by total limit', () => {
    const budgets = [
      makeBudget({ categoryId: 'cat-food', limitAmount: 1000 }),
      makeBudget({ id: 'b2', categoryId: 'cat-transport', limitAmount: 500 }),
    ];
    const expenses = [
      makeExpense({ categoryId: 'cat-food', amount: 600, date: '2026-08-01' }),
      makeExpense({ categoryId: 'cat-transport', amount: 150, date: '2026-08-02' }),
      makeExpense({ categoryId: 'cat-food', amount: 999, date: '2026-07-01' }),
    ];
    expect(overallBudgetUsage(budgets, expenses, '2026-08')).toBeCloseTo(750 / 1500);
  });
});

describe('moodFromUsage', () => {
  it('is happy when there are no budgets', () => {
    expect(moodFromUsage(null)).toBe('happy');
  });

  it('is happy under 50%', () => {
    expect(moodFromUsage(0.3)).toBe('happy');
  });

  it('is neutral between 50% and 80%', () => {
    expect(moodFromUsage(0.5)).toBe('neutral');
    expect(moodFromUsage(0.8)).toBe('neutral');
  });

  it('is sad over 80%', () => {
    expect(moodFromUsage(0.81)).toBe('sad');
  });
});

describe('hasOverThresholdBudget', () => {
  it('is false when nothing exceeds its threshold', () => {
    const budgets = [makeBudget({ limitAmount: 1000, alertThreshold: 0.8 })];
    const expenses = [makeExpense({ amount: 500, date: '2026-08-01' })];
    expect(hasOverThresholdBudget(budgets, expenses, '2026-08')).toBe(false);
  });

  it('is true when a category reaches its own alert threshold', () => {
    const budgets = [makeBudget({ limitAmount: 1000, alertThreshold: 0.8 })];
    const expenses = [makeExpense({ amount: 850, date: '2026-08-01' })];
    expect(hasOverThresholdBudget(budgets, expenses, '2026-08')).toBe(true);
  });

  it('ignores budgets from other months', () => {
    const budgets = [makeBudget({ month: '2026-07', limitAmount: 100, alertThreshold: 0.5 })];
    const expenses = [makeExpense({ amount: 999, date: '2026-07-01' })];
    expect(hasOverThresholdBudget(budgets, expenses, '2026-08')).toBe(false);
  });
});
