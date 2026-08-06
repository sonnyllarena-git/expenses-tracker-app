import {
  buildBudgetContext,
  buildChatContext,
  buildExpenseContext,
  buildLoanContext,
  buildSystemPrompt,
  buildWalletContext,
  categoryTotalsForMonth,
} from '../aiContext';
import type { Budget, Category, Expense, Loan, Wallet } from '@/types';

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
    limitAmount: 5000,
    month: '2026-08',
    alertThreshold: 0.8,
    createdAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeWallet(overrides: Partial<Wallet>): Wallet {
  return {
    id: 'wallet-id',
    userId: 'user-1',
    name: 'GCash',
    type: 'gcash',
    balance: 8200,
    currency: 'PHP',
    isArchived: false,
    createdAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeLoan(overrides: Partial<Loan>): Loan {
  return {
    id: 'loan-id',
    userId: 'user-1',
    lenderName: 'Bank loan',
    principalAmount: 50000,
    interestRate: null,
    monthlyPayment: 1500,
    startDate: '2026-01-01',
    remainingBalance: 45000,
    nextPaymentDate: '2026-09-01',
    notes: '',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
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
  {
    id: 'cat-transport',
    userId: 'user-1',
    name: 'Transport',
    icon: 'car',
    color: '#3B82F6',
    isCustom: false,
    createdAt: '2026-08-01T00:00:00.000Z',
  },
];

describe('categoryTotalsForMonth', () => {
  it('sums per category with transaction counts, sorted descending', () => {
    const expenses = [
      makeExpense({ amount: 3000, categoryId: 'cat-food', date: '2026-08-01' }),
      makeExpense({ amount: 2150, categoryId: 'cat-food', date: '2026-08-02' }),
      makeExpense({ amount: 1200, categoryId: 'cat-transport', date: '2026-08-03' }),
      makeExpense({ amount: 999, categoryId: 'cat-food', date: '2026-07-15' }),
    ];
    expect(categoryTotalsForMonth(expenses, categories, '2026-08')).toEqual([
      { categoryId: 'cat-food', name: 'Food', total: 5150, count: 2 },
      { categoryId: 'cat-transport', name: 'Transport', total: 1200, count: 1 },
    ]);
  });
});

describe('buildExpenseContext', () => {
  it('formats a per-category breakdown with a total line', () => {
    const expenses = [
      makeExpense({ amount: 5150, categoryId: 'cat-food', date: '2026-08-01' }),
      makeExpense({ amount: 1200, categoryId: 'cat-transport', date: '2026-08-02' }),
    ];
    const text = buildExpenseContext(expenses, categories, '2026-08', 'PHP');
    expect(text).toContain('August 2026 expenses:');
    expect(text).toContain('- Food: ₱5,150.00 (1 transaction)');
    expect(text).toContain('- Transport: ₱1,200.00 (1 transaction)');
    expect(text).toContain('Total: ₱6,350.00');
  });

  it('reports no data instead of an empty list', () => {
    expect(buildExpenseContext([], categories, '2026-08', 'PHP')).toBe(
      'August 2026 expenses: none recorded yet.'
    );
  });
});

describe('buildBudgetContext', () => {
  it('reports usage percentage per budgeted category', () => {
    const budgets = [makeBudget({ limitAmount: 5000, month: '2026-08' })];
    const expenses = [makeExpense({ amount: 5150, categoryId: 'cat-food', date: '2026-08-01' })];
    const text = buildBudgetContext(budgets, expenses, categories, '2026-08', 'PHP');
    expect(text).toBe('Food budget: ₱5,000.00/month, currently at 103% (₱5,150.00 spent)');
  });

  it('reports no budgets set when none exist for the month', () => {
    expect(buildBudgetContext([], [], categories, '2026-08', 'PHP')).toBe(
      'No budgets set for this month.'
    );
  });
});

describe('buildWalletContext', () => {
  it('lists each wallet, marking credit cards as available', () => {
    const wallets = [
      makeWallet({ name: 'GCash', type: 'gcash', balance: 8200 }),
      makeWallet({ name: 'Credit Card', type: 'credit_card', balance: 0 }),
      makeWallet({ name: 'Cash', type: 'cash', balance: 150 }),
    ];
    expect(buildWalletContext(wallets, 'PHP')).toBe(
      'Wallets: GCash ₱8,200.00, Credit Card ₱0.00 available, Cash ₱150.00'
    );
  });

  it('reports no wallets when none exist', () => {
    expect(buildWalletContext([], 'PHP')).toBe('No wallets set up yet.');
  });
});

describe('buildLoanContext', () => {
  it('lists active loans with remaining balance and monthly due', () => {
    const loans = [
      makeLoan({ lenderName: 'Bank loan', remainingBalance: 45000, monthlyPayment: 1500 }),
    ];
    expect(buildLoanContext(loans, 'PHP')).toBe(
      'Active loans: Bank loan ₱45,000.00 remaining (₱1,500.00/month due)'
    );
  });

  it('excludes paid-off loans and reports none active when all are inactive', () => {
    const loans = [makeLoan({ isActive: false })];
    expect(buildLoanContext(loans, 'PHP')).toBe('No active loans.');
  });
});

describe('buildChatContext', () => {
  it('joins every section into contextText', () => {
    const context = buildChatContext({
      expenses: [makeExpense({ amount: 500, categoryId: 'cat-food', date: '2026-08-01' })],
      categories,
      budgets: [],
      wallets: [makeWallet({})],
      loans: [makeLoan({})],
      month: '2026-08',
      currency: 'PHP',
    });
    expect(context.monthLabel).toBe('August 2026');
    expect(context.contextText).toContain('August 2026 expenses:');
    expect(context.contextText).toContain('No budgets set for this month.');
    expect(context.contextText).toContain('Wallets:');
    expect(context.contextText).toContain('Active loans:');
  });
});

describe('buildSystemPrompt', () => {
  it('frames the assistant as a spending analyst scoped to the given month', () => {
    const prompt = buildSystemPrompt('August 2026');
    expect(prompt).toContain('August 2026');
    expect(prompt).toContain('[SUGGEST_ACTION]');
    expect(prompt).toContain('Never guess amounts or categories');
  });
});
