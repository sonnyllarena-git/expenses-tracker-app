import { buildChatContext, type ChatContextData } from '../aiContext';
import { generateMockResponse } from '../mockLlm';
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

const wallets: Wallet[] = [
  {
    id: 'wallet-1',
    userId: 'user-1',
    name: 'GCash',
    type: 'gcash',
    balance: 8200,
    currency: 'PHP',
    isArchived: false,
    createdAt: '2026-08-01T00:00:00.000Z',
  },
];

const loans: Loan[] = [
  {
    id: 'loan-1',
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
  },
];

function makeContext(overrides: { expenses?: Expense[]; budgets?: Budget[] }): ChatContextData {
  return buildChatContext({
    expenses: overrides.expenses ?? [],
    categories,
    budgets: overrides.budgets ?? [],
    wallets,
    loans,
    month: '2026-08',
    currency: 'PHP',
  });
}

describe('generateMockResponse', () => {
  it('answers a category spending question with budget usage, matching the checklist example', () => {
    const context = makeContext({
      expenses: [makeExpense({ amount: 5150, categoryId: 'cat-food', date: '2026-08-01' })],
      budgets: [makeBudget({ limitAmount: 5000, month: '2026-08' })],
    });
    expect(generateMockResponse('How much did I spend on food?', context)).toBe(
      "You spent ₱5,150.00 on Food this month, which is 103% of your ₱5,000.00 budget. That's " +
        '₱150.00 over — consider cutting back next month.'
    );
  });

  it('answers "what\'s my X budget" the same way, since it names the category', () => {
    const context = makeContext({
      expenses: [makeExpense({ amount: 5150, categoryId: 'cat-food', date: '2026-08-01' })],
      budgets: [makeBudget({ limitAmount: 5000, month: '2026-08' })],
    });
    expect(generateMockResponse("What's my food budget?", context)).toContain('₱5,000.00 budget');
  });

  it('notes when a category has spend but no budget set', () => {
    const context = makeContext({
      expenses: [makeExpense({ amount: 300, categoryId: 'cat-food', date: '2026-08-01' })],
    });
    expect(generateMockResponse('food spending?', context)).toBe(
      "You've spent ₱300.00 on Food this month across 1 transaction. No budget set for this " +
        'category yet.'
    );
  });

  it('answers a wallet question with balances and net worth', () => {
    const context = makeContext({});
    const response = generateMockResponse('What are my wallet balances?', context);
    expect(response).toContain('GCash ₱8,200.00');
    expect(response).toContain('Net worth: ₱8,200.00');
  });

  it('answers a loan question with the active loan summary', () => {
    const context = makeContext({});
    expect(generateMockResponse('What do I still owe on my loans?', context)).toBe(
      'Active loans: Bank loan ₱45,000.00 remaining (₱1,500.00/month due)'
    );
  });

  it('answers a general spending question with the month total and top category', () => {
    const context = makeContext({
      expenses: [
        makeExpense({ amount: 5150, categoryId: 'cat-food', date: '2026-08-01' }),
        makeExpense({ amount: 1200, categoryId: 'cat-transport', date: '2026-08-02' }),
      ],
    });
    expect(generateMockResponse('How much did I spend this month?', context)).toBe(
      "You've spent ₱6,350.00 in August 2026 so far. Food is your top category at ₱5,150.00."
    );
  });

  it('responds gracefully without hallucinating data when asked something out of scope', () => {
    const context = makeContext({});
    const response = generateMockResponse('What is the capital of France?', context);
    expect(response).toMatch(/spending, budgets, wallets, and loans/);
  });

  it('emits a [SUGGEST_ACTION] block when asked to add an expense with a recognized category', () => {
    const context = makeContext({});
    const response = generateMockResponse('Add ₱500 for coffee', context);
    expect(response).toContain(
      '[SUGGEST_ACTION] expense:₱500 category:Food description:Coffee [/SUGGEST_ACTION]'
    );
  });

  it('asks a clarifying question instead of guessing the category', () => {
    const context = makeContext({});
    const response = generateMockResponse('Add ₱500 to my expenses', context);
    expect(response).not.toContain('[SUGGEST_ACTION]');
    expect(response).toContain('Which category should I file it under?');
    expect(response).toContain('Food');
    expect(response).toContain('Transport');
  });
});
