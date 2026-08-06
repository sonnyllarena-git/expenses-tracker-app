import {
  buildBudgetContext,
  buildLoanContext,
  buildWalletContext,
  categoryTotalsForMonth,
  type ChatContextData,
} from '@/utils/aiContext';
import { spentForCategory } from '@/utils/budget';
import { formatCurrency } from '@/utils/currency';
import type { Category } from '@/types';

/**
 * Stands in for real on-device inference (llama.rn, deferred to a follow-up
 * sprint — see agent notes for Weeks 11-12). Answers are assembled from the
 * structured context data directly rather than parsed out of a prompt
 * string, since that's far more reliable for a keyword-matching mock; a real
 * model would instead read the same data serialized in aiContext.ts's
 * `contextText` / buildFullPrompt.
 */
const ADD_INTENT_PATTERN = /\b(add|log|record|track)\b/i;
const AMOUNT_PATTERN = /(?:₱|php)?\s*(\d[\d,]*(?:\.\d+)?)/i;
const FOR_DESCRIPTION_PATTERN = /\bfor\s+([a-z][\w\s]{0,30})/i;

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Food: [
    'food',
    'lunch',
    'dinner',
    'breakfast',
    'coffee',
    'eat',
    'grocery',
    'groceries',
    'restaurant',
  ],
  Transport: ['transport', 'jeepney', 'jeep', 'grab', 'taxi', 'gas', 'fuel', 'fare', 'commute'],
  Entertainment: ['entertainment', 'movie', 'netflix', 'game', 'concert', 'streaming'],
  Utilities: ['utilities', 'electric', 'electricity', 'water bill', 'wifi', 'internet', 'bill'],
  Health: ['health', 'medicine', 'doctor', 'hospital', 'clinic', 'pharmacy'],
  Shopping: ['shopping', 'clothes', 'shoes', 'mall'],
};

const FALLBACK_RESPONSE =
  "I'm best at answering questions about your spending, budgets, wallets, and loans this month. " +
  'Try asking things like "How much did I spend on food?" or "What\'s my food budget?"';

function findCategoryByKeyword(message: string, categories: Category[]): Category | null {
  const lower = message.toLowerCase();

  for (const [name, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((keyword) => lower.includes(keyword))) {
      const match = categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
      if (match) {
        return match;
      }
    }
  }

  // Covers custom categories and names not in CATEGORY_KEYWORDS (e.g. "Loan Payment").
  return categories.find((c) => lower.includes(c.name.toLowerCase())) ?? null;
}

function extractAmount(message: string): number | null {
  const match = message.match(AMOUNT_PATTERN);
  if (!match) {
    return null;
  }
  const value = Number(match[1].replace(/,/g, ''));
  return Number.isFinite(value) && value > 0 ? value : null;
}

function extractDescription(message: string, category: Category): string {
  const match = message.match(FOR_DESCRIPTION_PATTERN);
  const captured = match?.[1]?.trim().replace(/[.,!?]+$/, '');
  if (captured) {
    return captured.charAt(0).toUpperCase() + captured.slice(1);
  }
  return `${category.name} expense`;
}

function tryBuildSuggestedAction(message: string, context: ChatContextData): string | null {
  if (!ADD_INTENT_PATTERN.test(message)) {
    return null;
  }
  const amount = extractAmount(message);
  if (amount === null) {
    return null;
  }

  const category = findCategoryByKeyword(message, context.categories);
  if (!category) {
    const names = context.categories.map((c) => c.name).join(', ');
    return (
      `Sure — I can add a ${formatCurrency(amount, context.currency)} expense. ` +
      `Which category should I file it under? (${names})`
    );
  }

  const description = extractDescription(message, category);
  return (
    `Got it! Here's what I'll add:\n\n` +
    `[SUGGEST_ACTION] expense:₱${amount} category:${category.name} description:${description} [/SUGGEST_ACTION]`
  );
}

function categoryAnswer(category: Category, context: ChatContextData): string {
  const spent = spentForCategory(context.expenses, category.id, context.month);
  const spentText = formatCurrency(spent, context.currency);
  const budget = context.budgets.find(
    (b) => b.categoryId === category.id && b.month === context.month
  );

  if (!budget) {
    const row = categoryTotalsForMonth(context.expenses, context.categories, context.month).find(
      (t) => t.categoryId === category.id
    );
    const count = row?.count ?? 0;
    return (
      `You've spent ${spentText} on ${category.name} this month across ${count} ` +
      `transaction${count === 1 ? '' : 's'}. No budget set for this category yet.`
    );
  }

  const pct = budget.limitAmount > 0 ? Math.round((spent / budget.limitAmount) * 100) : 0;
  const limitText = formatCurrency(budget.limitAmount, context.currency);

  if (spent > budget.limitAmount) {
    const over = formatCurrency(spent - budget.limitAmount, context.currency);
    return (
      `You spent ${spentText} on ${category.name} this month, which is ${pct}% of your ` +
      `${limitText} budget. That's ${over} over — consider cutting back next month.`
    );
  }

  const remaining = formatCurrency(budget.limitAmount - spent, context.currency);
  return (
    `You spent ${spentText} on ${category.name} this month, which is ${pct}% of your ` +
    `${limitText} budget. You've got ${remaining} left — nice work staying on track.`
  );
}

function walletAnswer(context: ChatContextData): string {
  const summary = buildWalletContext(context.wallets, context.currency);
  if (context.wallets.length === 0) {
    return summary;
  }
  const netWorth = context.wallets.reduce((sum, wallet) => sum + wallet.balance, 0);
  return `${summary}. Net worth: ${formatCurrency(netWorth, context.currency)}.`;
}

function loanAnswer(context: ChatContextData): string {
  return buildLoanContext(context.loans, context.currency);
}

function budgetAnswer(context: ChatContextData): string {
  const monthBudgets = context.budgets.filter((b) => b.month === context.month);
  if (monthBudgets.length === 0) {
    return `You haven't set any budgets for ${context.monthLabel} yet.`;
  }
  return buildBudgetContext(
    context.budgets,
    context.expenses,
    context.categories,
    context.month,
    context.currency
  );
}

function totalAnswer(context: ChatContextData): string {
  const totals = categoryTotalsForMonth(context.expenses, context.categories, context.month);
  if (totals.length === 0) {
    return `No expenses recorded for ${context.monthLabel} yet.`;
  }
  const total = totals.reduce((sum, row) => sum + row.total, 0);
  const top = totals[0];
  return (
    `You've spent ${formatCurrency(total, context.currency)} in ${context.monthLabel} so far. ` +
    `${top.name} is your top category at ${formatCurrency(top.total, context.currency)}.`
  );
}

/** Pattern-matches keywords in `message` and returns a templated, context-aware reply. */
export function generateMockResponse(message: string, context: ChatContextData): string {
  const suggestedAction = tryBuildSuggestedAction(message, context);
  if (suggestedAction) {
    return suggestedAction;
  }

  const category = findCategoryByKeyword(message, context.categories);
  if (category) {
    return categoryAnswer(category, context);
  }

  const lower = message.toLowerCase();
  if (/\b(wallet|balance|net worth)\b/.test(lower)) {
    return walletAnswer(context);
  }
  if (/\bloan/.test(lower)) {
    return loanAnswer(context);
  }
  if (/\bbudget/.test(lower)) {
    return budgetAnswer(context);
  }
  if (/\b(spend|spent|total|summary|overview)\b|this month/.test(lower)) {
    return totalAnswer(context);
  }

  return FALLBACK_RESPONSE;
}
