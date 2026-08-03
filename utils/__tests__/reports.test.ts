import { budgetVsActual, groupExpensesByCategory, groupExpensesByDay } from '../reports';
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
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeCategory(overrides: Partial<Category>): Category {
  return {
    id: 'cat-food',
    userId: 'user-1',
    name: 'Food',
    icon: 'fast-food',
    color: '#F4511E',
    isCustom: false,
    createdAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeBudget(overrides: Partial<Budget>): Budget {
  return {
    id: 'budget-id',
    userId: 'user-1',
    categoryId: 'cat-food',
    limitAmount: 500,
    month: '2026-08',
    alertThreshold: 0.8,
    createdAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('groupExpensesByCategory', () => {
  const categories = [
    makeCategory({}),
    makeCategory({ id: 'cat-transport', name: 'Transport', color: '#1E88E5' }),
  ];

  it('sums amounts per category, filtered to the given month, sorted descending', () => {
    const expenses = [
      makeExpense({ categoryId: 'cat-food', amount: 100, date: '2026-08-01' }),
      makeExpense({ categoryId: 'cat-food', amount: 50, date: '2026-08-15' }),
      makeExpense({ categoryId: 'cat-transport', amount: 300, date: '2026-08-02' }),
      makeExpense({ categoryId: 'cat-food', amount: 999, date: '2026-07-31' }),
    ];

    const slices = groupExpensesByCategory(expenses, categories, '2026-08');

    expect(slices).toEqual([
      { categoryId: 'cat-transport', name: 'Transport', color: '#1E88E5', value: 300 },
      { categoryId: 'cat-food', name: 'Food', color: '#F4511E', value: 150 },
    ]);
  });

  it('falls back to Uncategorized for an unknown category', () => {
    const expenses = [makeExpense({ categoryId: 'missing-cat', amount: 42, date: '2026-08-01' })];
    const slices = groupExpensesByCategory(expenses, categories, '2026-08');
    expect(slices).toEqual([
      { categoryId: 'missing-cat', name: 'Uncategorized', color: '#999', value: 42 },
    ]);
  });

  it('returns an empty array when nothing falls in the given month', () => {
    const expenses = [makeExpense({ date: '2026-07-01' })];
    expect(groupExpensesByCategory(expenses, categories, '2026-08')).toEqual([]);
  });
});

describe('groupExpensesByDay', () => {
  it('zero-fills every day of the month and sums same-day expenses', () => {
    const expenses = [
      makeExpense({ date: '2026-02-01', amount: 10 }),
      makeExpense({ date: '2026-02-01', amount: 5 }),
      makeExpense({ date: '2026-02-15', amount: 20 }),
      makeExpense({ date: '2026-01-31', amount: 999 }),
    ];

    const points = groupExpensesByDay(expenses, '2026-02');

    expect(points).toHaveLength(28);
    expect(points[0]).toEqual({ day: 1, label: '1', value: 15 });
    expect(points[14]).toEqual({ day: 15, label: '15', value: 20 });
    expect(points[1]).toEqual({ day: 2, label: '', value: 0 });
  });

  it('labels only day 1 and multiples of 5', () => {
    const points = groupExpensesByDay([], '2026-01');
    const labeled = points.filter((p) => p.label !== '').map((p) => p.day);
    expect(labeled).toEqual([1, 5, 10, 15, 20, 25, 30]);
  });
});

describe('budgetVsActual', () => {
  const categories = [makeCategory({})];

  it('computes actual, remaining, and over-limit status for the given month', () => {
    const budgets = [makeBudget({ limitAmount: 200, month: '2026-08' })];
    const expenses = [
      makeExpense({ categoryId: 'cat-food', amount: 120, date: '2026-08-01' }),
      makeExpense({ categoryId: 'cat-food', amount: 999, date: '2026-07-01' }),
    ];

    const rows = budgetVsActual(budgets, expenses, categories, '2026-08');

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      categoryName: 'Food',
      actual: 120,
      remaining: 80,
      isOverLimit: false,
    });
  });

  it('flags a category as over limit', () => {
    const budgets = [makeBudget({ limitAmount: 100, month: '2026-08' })];
    const expenses = [makeExpense({ categoryId: 'cat-food', amount: 150, date: '2026-08-01' })];

    const rows = budgetVsActual(budgets, expenses, categories, '2026-08');

    expect(rows[0].isOverLimit).toBe(true);
    expect(rows[0].remaining).toBe(-50);
  });

  it('excludes budgets from other months', () => {
    const budgets = [makeBudget({ month: '2026-07' })];
    expect(budgetVsActual(budgets, [], categories, '2026-08')).toEqual([]);
  });
});
