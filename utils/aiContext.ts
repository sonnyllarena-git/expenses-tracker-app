import type { Budget, Category, Expense, Loan, Wallet } from '@/types';
import { spentForCategory } from '@/utils/budget';
import { formatCurrency } from '@/utils/currency';
import { formatMonthLabel } from '@/utils/date';

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
}

export function buildChatContext(input: {
  expenses: Expense[];
  categories: Category[];
  budgets: Budget[];
  wallets: Wallet[];
  loans: Loan[];
  month: string;
  currency: string;
}): ChatContextData {
  const { expenses, categories, budgets, wallets, loans, month, currency } = input;

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
  };
}

/** Frames the AI as a spending analyst scoped to this month's data. */
export function buildSystemPrompt(monthLabel: string): string {
  return (
    `You are a personal finance assistant. You have access to the user's expense data from ` +
    `${monthLabel}. Analyze their spending, answer questions about categories, budgets, and ` +
    `trends. Be conversational and friendly. If the word "budget" appears in the user's ` +
    `request, they mean a monthly budget LIMIT for a category, not an expense — respond with ` +
    `a structured suggestion in the format: [SUGGEST_ACTION] budget:₱[amount] category:[cat] ` +
    `alertThreshold:[pct] [/SUGGEST_ACTION] (default alertThreshold to 80 if unspecified). ` +
    `Otherwise, if the user asks you to add an expense, respond with: [SUGGEST_ACTION] ` +
    `expense:₱[amount] category:[cat] description:[desc] [/SUGGEST_ACTION]. Never guess ` +
    `amounts or categories — ask clarifying questions.`
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
