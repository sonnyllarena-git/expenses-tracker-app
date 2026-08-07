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

function makeContext(overrides: {
  expenses?: Expense[];
  budgets?: Budget[];
  recurringTemplates?: Expense[];
  payday?: number;
  today?: string;
}): ChatContextData {
  return buildChatContext({
    expenses: overrides.expenses ?? [],
    categories,
    budgets: overrides.budgets ?? [],
    wallets,
    loans,
    month: '2026-08',
    currency: 'PHP',
    recurringTemplates: overrides.recurringTemplates,
    payday: overrides.payday,
    today: overrides.today,
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

  it('emits a budget (not expense) [SUGGEST_ACTION] when "budget" appears in an add request', () => {
    const context = makeContext({});
    const response = generateMockResponse('add ₱5000 budget Food', context);
    expect(response).not.toContain('expense:');
    expect(response).toContain(
      '[SUGGEST_ACTION] budget:₱5000 category:Food alertThreshold:80 [/SUGGEST_ACTION]'
    );
  });

  it('routes a differently-worded budget request the same way, matching the acceptance test', () => {
    const context = makeContext({});
    const response = generateMockResponse('add 3000 budget to food', context);
    expect(response).toContain(
      '[SUGGEST_ACTION] budget:₱3000 category:Food alertThreshold:80 [/SUGGEST_ACTION]'
    );
  });

  it('reads an explicit alert percentage out of the message', () => {
    const context = makeContext({});
    const response = generateMockResponse('add 3000 budget to food, alert at 90%', context);
    expect(response).toContain(
      '[SUGGEST_ACTION] budget:₱3000 category:Food alertThreshold:90 [/SUGGEST_ACTION]'
    );
  });

  it('asks a clarifying question for a budget instead of guessing the category', () => {
    const context = makeContext({});
    const response = generateMockResponse('set a ₱2000 budget', context);
    expect(response).not.toContain('[SUGGEST_ACTION]');
    expect(response).toContain('Which category should it apply to?');
  });
});

describe('generateMockResponse — Weeks 11-12 insight knowledge areas', () => {
  it('#9 answers a payday countdown with days remaining and budget usage so far', () => {
    const context = makeContext({
      expenses: [makeExpense({ amount: 2000, categoryId: 'cat-food', date: '2026-08-01' })],
      budgets: [makeBudget({ limitAmount: 5000 })],
      payday: 15,
      today: '2026-08-06',
    });
    const response = generateMockResponse('When is payday?', context);
    expect(response).toContain('9 days until payday');
    expect(response).toContain('Aug 15, 2026');
    expect(response).toContain("You've spent 40% of your monthly budget so far.");
  });

  it('#2 lists upcoming recurring bills due within the next 7 days', () => {
    const netflix = makeExpense({
      id: 'template-netflix',
      isRecurring: true,
      recurringFrequency: 'monthly',
      categoryId: 'cat-food',
      amount: 599,
      date: '2026-08-10',
      description: 'Netflix',
    });
    const context = makeContext({ recurringTemplates: [netflix], today: '2026-08-05' });
    const response = generateMockResponse("What's due this week?", context);
    expect(response).toContain('Netflix ₱599.00 due Aug 10, 2026');
    expect(response).toContain('1 bill due this week: ₱599.00 total.');
  });

  it('#2 reports no bills due when nothing is upcoming', () => {
    const context = makeContext({ today: '2026-08-05' });
    expect(generateMockResponse('Any upcoming bills?', context)).toBe(
      'No bills due in the next 7 days. 🎉'
    );
  });

  it('#3 answers a "how much do I have" wallet question', () => {
    const context = makeContext({});
    const response = generateMockResponse('How much do I have?', context);
    expect(response).toContain('GCash ₱8,200.00');
    expect(response).toContain('Net worth: ₱8,200.00');
  });

  it('#11 flags total recurring subscriptions worth reviewing', () => {
    const netflix = makeExpense({
      id: 't1',
      isRecurring: true,
      recurringFrequency: 'monthly',
      amount: 599,
      description: 'Netflix',
    });
    const spotify = makeExpense({
      id: 't2',
      isRecurring: true,
      recurringFrequency: 'monthly',
      amount: 180,
      description: 'Spotify',
    });
    const context = makeContext({ recurringTemplates: [netflix, spotify] });
    const response = generateMockResponse('Where can I save?', context);
    expect(response).toContain('₱779.00/month');
    expect(response).toContain('Netflix ₱599.00');
    expect(response).toContain('Spotify ₱180.00');
  });

  it('#5 compares this week vs last week spending overall', () => {
    const context = makeContext({
      expenses: [
        makeExpense({ amount: 2300, categoryId: 'cat-food', date: '2026-08-05' }),
        makeExpense({ amount: 1650, categoryId: 'cat-food', date: '2026-07-28' }),
      ],
      today: '2026-08-06',
    });
    const response = generateMockResponse('Are my spending trends up or down?', context);
    expect(response).toContain('₱2,300.00 this week vs ₱1,650.00 last week');
    expect(response).toContain('+39%');
  });

  it('#5 compares this week vs last week for a named category', () => {
    const context = makeContext({
      expenses: [
        makeExpense({ amount: 2300, categoryId: 'cat-food', date: '2026-08-05' }),
        makeExpense({ amount: 1650, categoryId: 'cat-food', date: '2026-07-28' }),
      ],
      today: '2026-08-06',
    });
    const response = generateMockResponse("How's food trending?", context);
    expect(response).toBe('Food ₱2,300.00 this week vs ₱1,650.00 last week (+39% ↑).');
  });

  it("#6 summarizes yesterday's spend by category", () => {
    const context = makeContext({
      expenses: [
        makeExpense({ amount: 250, categoryId: 'cat-food', date: '2026-08-05' }),
        makeExpense({ amount: 200, categoryId: 'cat-transport', date: '2026-08-05' }),
      ],
      today: '2026-08-06',
    });
    const response = generateMockResponse('What did I spend yesterday?', context);
    expect(response).toBe('Yesterday ₱450.00 on 2 transactions: Food ₱250.00, Transport ₱200.00');
  });

  it("#6 summarizes this week's spend by category with percentage share", () => {
    const context = makeContext({
      expenses: [
        makeExpense({ amount: 1200, categoryId: 'cat-food', date: '2026-08-03' }),
        makeExpense({ amount: 800, categoryId: 'cat-transport', date: '2026-08-04' }),
      ],
      today: '2026-08-06',
    });
    const response = generateMockResponse('this week total?', context);
    expect(response).toBe('This week ₱2,000.00 spent: Food ₱1,200.00 (60%), Transport ₱800.00 (40%)');
  });

  it('#7 gives next-month tips per budgeted category', () => {
    const context = makeContext({
      expenses: [
        makeExpense({ amount: 5150, categoryId: 'cat-food', date: '2026-08-01' }),
        makeExpense({ amount: 900, categoryId: 'cat-transport', date: '2026-08-02' }),
      ],
      budgets: [
        makeBudget({ categoryId: 'cat-food', limitAmount: 5000 }),
        makeBudget({ id: 'budget-transport', categoryId: 'cat-transport', limitAmount: 1200 }),
      ],
    });
    const response = generateMockResponse('Any tips for next month?', context);
    expect(response).toContain('Food over budget by ₱150.00 — try to keep under ₱5,000.00 next month');
    expect(response).toContain('Transport on track (₱900.00/₱1,200.00)');
  });

  it('#8 surfaces top categories by share of spend', () => {
    const context = makeContext({
      expenses: [
        makeExpense({ amount: 3000, categoryId: 'cat-food', date: '2026-08-01' }),
        makeExpense({ amount: 1000, categoryId: 'cat-transport', date: '2026-08-02' }),
      ],
    });
    const response = generateMockResponse('Give me a breakdown', context);
    expect(response).toBe('Top categories: Food 75%, Transport 25%.');
  });

  it('#10 reports which wallet gets used most, by transaction share', () => {
    const context = makeContext({
      expenses: [
        makeExpense({
          amount: 100,
          categoryId: 'cat-food',
          date: '2026-08-01',
          walletId: 'wallet-1',
        }),
        makeExpense({
          amount: 100,
          categoryId: 'cat-food',
          date: '2026-08-02',
          walletId: 'wallet-1',
        }),
        makeExpense({ amount: 100, categoryId: 'cat-transport', date: '2026-08-03' }),
      ],
    });
    const response = generateMockResponse('Which wallet do I use most?', context);
    expect(response).toContain('You mostly use GCash (67% of transactions).');
    expect(response).toContain('Unassigned 33%');
  });

  it('#12 gives a full budget-vs-actual comparison grid', () => {
    const context = makeContext({
      expenses: [
        makeExpense({ amount: 5150, categoryId: 'cat-food', date: '2026-08-01' }),
        makeExpense({ amount: 900, categoryId: 'cat-transport', date: '2026-08-02' }),
      ],
      budgets: [
        makeBudget({ categoryId: 'cat-food', limitAmount: 5000 }),
        makeBudget({ id: 'budget-transport', categoryId: 'cat-transport', limitAmount: 1200 }),
      ],
    });
    const response = generateMockResponse('How am I doing on my budgets?', context);
    expect(response).toBe(
      'Food: ₱5,150.00 spent of ₱5,000.00 (103%) — ₱150.00 over\n' +
        'Transport: ₱900.00 spent of ₱1,200.00 (75%) — ₱300.00 left'
    );
  });

  it('greets proactively with the most urgent budget alert and an upcoming bill', () => {
    const netflix = makeExpense({
      id: 't1',
      isRecurring: true,
      recurringFrequency: 'monthly',
      categoryId: 'cat-food',
      amount: 599,
      date: '2026-08-10',
      description: 'Netflix',
    });
    const context = makeContext({
      expenses: [makeExpense({ amount: 4250, categoryId: 'cat-food', date: '2026-08-01' })],
      budgets: [makeBudget({ categoryId: 'cat-food', limitAmount: 5000 })],
      recurringTemplates: [netflix],
      today: '2026-08-05',
    });
    const response = generateMockResponse('hi', context);
    expect(response).toContain("You're at 85% of your Food budget (₱750.00 left).");
    expect(response).toContain('Netflix is due Aug 10, 2026.');
    expect(response).toContain('Want a full breakdown?');
  });

  it('greets with a generic prompt when there is nothing urgent to surface', () => {
    const context = makeContext({ today: '2026-08-05' });
    const response = generateMockResponse('hello', context);
    expect(response).toContain('Ask me about your spending, budgets, wallets, or loans this month.');
  });
});
