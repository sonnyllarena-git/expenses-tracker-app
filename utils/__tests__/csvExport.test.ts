import { expensesToCsv } from '../csvExport';
import type { Category, Expense } from '@/types';

function makeExpense(overrides: Partial<Expense>): Expense {
  return {
    id: 'expense-id',
    userId: 'user-1',
    addedByUserId: null,
    amount: 100,
    categoryId: 'cat-food',
    subcategoryId: null,
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

describe('expensesToCsv', () => {
  it('includes the header row', () => {
    expect(expensesToCsv([], [])).toBe('Date,Category,Description,Amount,Tags');
  });

  it('emits one row per expense, in input order', () => {
    const expenses = [
      makeExpense({ date: '2026-08-01', amount: 100 }),
      makeExpense({ date: '2026-08-02', amount: 50 }),
    ];
    const csv = expensesToCsv(expenses, [makeCategory({})]);
    const lines = csv.split('\r\n');

    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe('"2026-08-01","Food","",100.00,""');
    expect(lines[2]).toBe('"2026-08-02","Food","",50.00,""');
  });

  it('formats amount as a plain fixed-2-decimal number, not a currency string', () => {
    const csv = expensesToCsv([makeExpense({ amount: 1234.5 })], [makeCategory({})]);
    expect(csv).toContain(',1234.50,');
  });

  it('falls back to Uncategorized for an unknown category', () => {
    const csv = expensesToCsv([makeExpense({ categoryId: 'missing' })], [makeCategory({})]);
    expect(csv).toContain('"Uncategorized"');
  });

  it('joins tags with a semicolon, not a comma', () => {
    const csv = expensesToCsv([makeExpense({ tags: ['work', 'urgent'] })], [makeCategory({})]);
    expect(csv).toContain('"work;urgent"');
  });

  it('escapes quotes and preserves commas within a field', () => {
    const csv = expensesToCsv(
      [makeExpense({ description: 'Lunch, "the usual"' })],
      [makeCategory({})]
    );
    expect(csv).toContain('"Lunch, ""the usual"""');
  });
});
