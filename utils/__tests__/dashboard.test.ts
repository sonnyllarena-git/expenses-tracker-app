import { last7DaysSpend, monthIncomeVsExpenses, upcomingRecurringExpenses } from '../dashboard';
import type { Category, Expense, Income } from '@/types';

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

function makeIncome(overrides: Partial<Income>): Income {
  return {
    id: 'income-id',
    userId: 'user-1',
    amount: 1000,
    source: 'Salary',
    date: '2026-08-01',
    isRecurring: false,
    recurringFrequency: null,
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

describe('last7DaysSpend', () => {
  it('returns 7 days ending on today, oldest first, zero-filled', () => {
    const expenses = [
      makeExpense({ date: '2026-08-03', amount: 50 }),
      makeExpense({ date: '2026-08-03', amount: 25 }),
      makeExpense({ date: '2026-07-20', amount: 999 }), // outside the 7-day window
    ];

    const bars = last7DaysSpend(expenses, '2026-08-03');

    expect(bars).toHaveLength(7);
    expect(bars[0].label).toBe('Tue'); // 2026-07-28
    expect(bars[6].label).toBe('Mon'); // 2026-08-03
    expect(bars[6].value).toBe(75);
    expect(bars.slice(0, 6).every((b) => b.value === 0)).toBe(true);
  });

  it('rolls a window spanning a month boundary correctly', () => {
    const expenses = [makeExpense({ date: '2026-07-30', amount: 40 })];
    const bars = last7DaysSpend(expenses, '2026-08-02');
    expect(bars.find((b) => b.value === 40)).toBeDefined();
  });
});

describe('upcomingRecurringExpenses', () => {
  it('includes an active template due within the window, with correct days left', () => {
    const template = makeExpense({
      id: 'template-1',
      isRecurring: true,
      recurringFrequency: 'monthly',
      categoryId: 'cat-food',
      amount: 500,
      date: '2026-08-10',
    });

    const result = upcomingRecurringExpenses([template], [template], categories, '2026-08-03', 30);

    expect(result).toEqual([
      {
        templateId: 'template-1',
        categoryName: 'Food',
        categoryIcon: 'fast-food',
        categoryColor: '#2D7F4A',
        dueDate: '2026-08-10',
        amount: 500,
        daysLeft: 7,
      },
    ]);
  });

  it('excludes paused templates', () => {
    const template = makeExpense({
      id: 'template-1',
      isRecurring: false,
      recurringFrequency: 'monthly',
      date: '2026-08-10',
    });

    expect(upcomingRecurringExpenses([template], [template], categories, '2026-08-03', 30)).toEqual(
      []
    );
  });

  it('excludes templates due beyond the window', () => {
    const template = makeExpense({
      id: 'template-1',
      isRecurring: true,
      recurringFrequency: 'monthly',
      date: '2026-09-15',
    });

    expect(upcomingRecurringExpenses([template], [template], categories, '2026-08-03', 30)).toEqual(
      []
    );
  });

  it('sorts multiple templates soonest-due first', () => {
    const soon = makeExpense({
      id: 'template-soon',
      isRecurring: true,
      recurringFrequency: 'monthly',
      date: '2026-08-05',
    });
    const later = makeExpense({
      id: 'template-later',
      isRecurring: true,
      recurringFrequency: 'monthly',
      date: '2026-08-20',
    });

    const result = upcomingRecurringExpenses(
      [later, soon],
      [later, soon],
      categories,
      '2026-08-01',
      30
    );

    expect(result.map((r) => r.templateId)).toEqual(['template-soon', 'template-later']);
  });
});

describe('monthIncomeVsExpenses', () => {
  it('sums income and expenses independently for the given month and nets them', () => {
    const income = [
      makeIncome({ date: '2026-08-01', amount: 20000 }),
      makeIncome({ date: '2026-07-31', amount: 999 }), // outside the month
    ];
    const expenses = [
      makeExpense({ date: '2026-08-05', amount: 3000 }),
      makeExpense({ date: '2026-07-31', amount: 999 }), // outside the month
    ];

    expect(monthIncomeVsExpenses(income, expenses, '2026-08')).toEqual({
      totalIncome: 20000,
      totalExpenses: 3000,
      net: 17000,
    });
  });
});
