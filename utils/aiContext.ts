import type { Budget, Category, Expense, Loan, Wallet } from '@/types';
import { spentForCategory } from '@/utils/budget';
import { formatCurrency } from '@/utils/currency';
import { formatMonthLabel, today as getToday } from '@/utils/date';

export interface CategoryTotal {
  categoryId: string;
  name: string;
  total: number;
  count: number;
}

/** This month's per-category spend + transaction count, sorted descending by amount. */
export function categoryTotalsForMonth(
  expenses: Expense[],
  categories: Category[],
  month: string
): CategoryTotal[] {
  const totals = new Map<string, { total: number; count: number }>();
  for (const expense of expenses) {
    if (!expense.date.startsWith(month)) {
      continue;
    }
    const entry = totals.get(expense.categoryId) ?? { total: 0, count: 0 };
    entry.total += expense.amount;
    entry.count += 1;
    totals.set(expense.categoryId, entry);
  }

  const rows: CategoryTotal[] = [];
  for (const [categoryId, { total, count }] of totals) {
    if (total <= 0) {
      continue;
    }
    const category = categories.find((c) => c.id === categoryId);
    rows.push({ categoryId, name: category?.name ?? 'Uncategorized', total, count });
  }

  return rows.sort((a, b) => b.total - a.total);
}

/** "August 2026 expenses:\n- Food: ₱5,150.00 (12 transactions)\n...\nTotal: ₱6,650.00" */
export function buildExpenseContext(
  expenses: Expense[],
  categories: Category[],
  month: string,
  currency: string
): string {
  const rows = categoryTotalsForMonth(expenses, categories, month);
  const monthLabel = formatMonthLabel(month);

  if (rows.length === 0) {
    return `${monthLabel} expenses: none recorded yet.`;
  }

  const lines = rows.map(
    (row) =>
      `- ${row.name}: ${formatCurrency(row.total, currency)} (${row.count} transaction${row.count === 1 ? '' : 's'})`
  );
  const total = rows.reduce((sum, row) => sum + row.total, 0);

  return [`${monthLabel} expenses:`, ...lines, `Total: ${formatCurrency(total, currency)}`].join(
    '\n'
  );
}

/** "Food budget: ₱5,000.00/month, currently at 103% (₱5,150.00 spent)" per budgeted category. */
export function buildBudgetContext(
  budgets: Budget[],
  expenses: Expense[],
  categories: Category[],
  month: string,
  currency: string
): string {
  const monthBudgets = budgets.filter((b) => b.month === month);
  if (monthBudgets.length === 0) {
    return 'No budgets set for this month.';
  }

  const lines = monthBudgets.map((budget) => {
    const category = categories.find((c) => c.id === budget.categoryId);
    const spent = spentForCategory(expenses, budget.categoryId, month);
    const pct = budget.limitAmount > 0 ? Math.round((spent / budget.limitAmount) * 100) : 0;
    return `${category?.name ?? 'Uncategorized'} budget: ${formatCurrency(budget.limitAmount, currency)}/month, currently at ${pct}% (${formatCurrency(spent, currency)} spent)`;
  });

  return lines.join('\n');
}

/** "Wallets: GCash ₱8,200.00, Credit Card ₱0.00 available, Cash ₱150.00" */
export function buildWalletContext(wallets: Wallet[], currency: string): string {
  if (wallets.length === 0) {
    return 'No wallets set up yet.';
  }

  const parts = wallets.map((wallet) => {
    const suffix = wallet.type === 'credit_card' ? ' available' : '';
    return `${wallet.name} ${formatCurrency(wallet.balance, wallet.currency || currency)}${suffix}`;
  });

  return `Wallets: ${parts.join(', ')}`;
}

/** "Active loans: Bank loan ₱45,000.00 remaining (₱1,500.00/month due)" */
export function buildLoanContext(loans: Loan[], currency: string): string {
  const active = loans.filter((loan) => loan.isActive);
  if (active.length === 0) {
    return 'No active loans.';
  }

  const parts = active.map(
    (loan) =>
      `${loan.lenderName} ${formatCurrency(loan.remainingBalance, currency)} remaining (${formatCurrency(loan.monthlyPayment, currency)}/month due)`
  );

  return `Active loans: ${parts.join(', ')}`;
}

export interface ChatContextData {
  expenses: Expense[];
  categories: Category[];
  budgets: Budget[];
  wallets: Wallet[];
  loans: Loan[];
  month: string;
  monthLabel: string;
  currency: string;
  /** Expense + budget + wallet + loan sections, joined — the block a real LLM would read. */
  contextText: string;
  /** Recurring templates (rows in the expenses table with isRecurring set). */
  recurringTemplates: Expense[];
  /** Day of month (1-31) the user's salary/income typically lands. */
  payday: number;
  /** Today as YYYY-MM-DD; overridable for deterministic tests. */
  today: string;
}

export function buildChatContext(input: {
  expenses: Expense[];
  categories: Category[];
  budgets: Budget[];
  wallets: Wallet[];
  loans: Loan[];
  month: string;
  currency: string;
  recurringTemplates?: Expense[];
  payday?: number;
  today?: string;
}): ChatContextData {
  const {
    expenses,
    categories,
    budgets,
    wallets,
    loans,
    month,
    currency,
    recurringTemplates = [],
    payday = 25,
    today = getToday(),
  } = input;

  const contextText = [
    buildExpenseContext(expenses, categories, month, currency),
    buildBudgetContext(budgets, expenses, categories, month, currency),
    buildWalletContext(wallets, currency),
    buildLoanContext(loans, currency),
  ].join('\n\n');

  return {
    expenses,
    categories,
    budgets,
    wallets,
    loans,
    month,
    monthLabel: formatMonthLabel(month),
    currency,
    contextText,
    recurringTemplates,
    payday,
    today,
  };
}

/** Frames the AI as a spending analyst scoped to this month's data. */
export function buildSystemPrompt(monthLabel: string): string {
  return (
    `You are a personal finance assistant. You have access to the user's expense, budget, ` +
    `wallet, loan, and recurring-bill data for ${monthLabel}. Analyze their spending, answer ` +
    `questions about categories, budgets, and trends. Be conversational, friendly, and concise ` +
    `(aim for under 200 characters per reply). Never guess amounts or categories — ask ` +
    `clarifying questions instead.\n\n` +
    `Volunteer insight from these 12 areas whenever relevant, even if the user didn't ask ` +
    `directly:\n` +
    `1. Budget alerts — spend vs. limit per category, flagging when over.\n` +
    `2. Recurring bill reminders — what's due in the next 7 days.\n` +
    `3. Wallet balances — per-wallet balance and net worth.\n` +
    `4. Loan tracking — remaining balance and next payment.\n` +
    `5. Spending trends — this week vs. last week, by category or overall.\n` +
    `6. Daily/weekly summaries — yesterday's or this week's spend by category.\n` +
    `7. Best practices — which budgeted categories are over, on track, or under, for next month.\n` +
    `8. Category insights — top categories and categories with zero spend.\n` +
    `9. Payday countdown — days until payday and budget used so far.\n` +
    `10. Payment method insights — which wallet gets used most.\n` +
    `11. Savings opportunities — total recurring subscriptions worth reviewing.\n` +
    `12. Budget vs. actuals — a full per-category comparison grid.\n` +
    `If the user just greets you, lead with the single most urgent insight (an over-budget ` +
    `category, else an upcoming bill) before inviting a full breakdown.\n\n` +
    `If the word "budget" appears in the user's request AND they're asking you to set or add ` +
    `one, they mean a monthly budget LIMIT for a category, not an expense — respond with a ` +
    `structured suggestion in the format: [SUGGEST_ACTION] budget:₱[amount] category:[cat] ` +
    `alertThreshold:[pct] [/SUGGEST_ACTION] (default alertThreshold to 80 if unspecified). ` +
    `Otherwise, if the user asks you to add an expense, respond with: [SUGGEST_ACTION] ` +
    `expense:₱[amount] category:[cat] description:[desc] [/SUGGEST_ACTION].`
  );
}

/**
 * The full prompt a real LLM (e.g. llama.rn, once it lands) would receive.
 * The mock LLM (utils/mockLlm.ts) answers from `context`'s structured data
 * directly rather than parsing this string, but assembling it here now means
 * swapping in real inference later only touches the inference call itself.
 */
export function buildFullPrompt(context: ChatContextData, userMessage: string): string {
  return `${buildSystemPrompt(context.monthLabel)}\n\n${context.contextText}\n\nUser: ${userMessage}`;
}
