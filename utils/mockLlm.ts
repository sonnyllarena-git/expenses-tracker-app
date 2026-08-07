import {
  buildBudgetContext,
  buildLoanContext,
  buildWalletContext,
  categoryTotalsForMonth,
  type ChatContextData,
} from '@/utils/aiContext';
import { overallBudgetUsage, spentForCategory } from '@/utils/budget';
import { formatCurrency } from '@/utils/currency';
import { upcomingRecurringExpenses } from '@/utils/dashboard';
import { daysUntilPayday, formatDate, greetingForNow, nextPaydayDate, shiftDate } from '@/utils/date';
import { budgetVsActual } from '@/utils/reports';
import { weekOverWeekForCategory, weekOverWeekTotal } from '@/utils/trends';
import { MERCHANT_SUBCATEGORY_MAP } from '@/constants/subcategories';
import { WALLET_TYPE_OPTIONS } from '@/constants/wallets';
import type { Category, Subcategory, WalletType } from '@/types';

/**
 * Stands in for real on-device inference (llama.rn, deferred to a follow-up
 * sprint — see agent notes for Weeks 11-12). Answers are assembled from the
 * structured context data directly rather than parsed out of a prompt
 * string, since that's far more reliable for a keyword-matching mock; a real
 * model would instead read the same data serialized in aiContext.ts's
 * `contextText` / buildFullPrompt.
 */
// "spent"/"paid" cover natural expense-logging phrasing like "spent 599 on
// netflix" that doesn't use an explicit "add" verb.
const ADD_INTENT_PATTERN = /\b(add|log|record|track|spent|paid)\b/i;
const BUDGET_INTENT_PATTERN = /\b(add|log|record|track|set|create)\b/i;
const BUDGET_KEYWORD_PATTERN = /\bbudget/i;
const AMOUNT_PATTERN = /(?:₱|php)?\s*(\d[\d,]*(?:\.\d+)?)/i;
const FOR_DESCRIPTION_PATTERN = /\bfor\s+([a-z][\w\s]{0,30})/i;
const ALERT_THRESHOLD_PATTERN = /\balert\w*\s*(?:at|of|threshold\s*(?:at|of)?)?\s*(\d{1,3})\s*%/i;
const DEFAULT_ALERT_THRESHOLD_PCT = 80;

// Weeks 11-12: the 12 read-only "insight" knowledge areas, checked in order
// of specificity so a narrowly-worded question (e.g. "budget comparison")
// doesn't fall into a broader existing bucket (e.g. plain "budget").
const GREETING_PATTERN = /\b(hi|hello|hey|good morning|good afternoon|good evening)\b/i;
const PAYDAY_PATTERN = /\bpayday\b|\bam i on track\b/i;
const RECURRING_PATTERN =
  /\b(what.?s due|upcoming (bills?|payments?)|next payment|bills? due|due (this|next) week)\b/i;
const SAVINGS_PATTERN = /\b(where can i save|cut expenses?|subscriptions?|save money)\b/i;
const TRENDS_PATTERN = /\btrend(s|ing)?\b|\b(up or down|going up|going down)\b/i;
const YESTERDAY_PATTERN = /\byesterday\b/i;
const WEEK_SUMMARY_PATTERN = /\b(this week|summary)\b/i;
const BEST_PRACTICES_PATTERN = /\b(tips|best practices?|advice)\b/i;
const BUDGET_COMPARISON_PATTERN = /\b(budget comparison|how am i doing on (my )?budgets?)\b/i;
const CATEGORY_INSIGHTS_PATTERN = /\b(top categories|breakdown|where.*money.*going)\b/i;
const PAYMENT_METHOD_PATTERN = /\b(payment method|which wallet)\b/i;
const RECURRING_DAYS_AHEAD = 7;

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

// Wallets have no category, so "add"/"wallet" requests are routed here
// instead of tryBuildSuggestedAction's expense flow — see the priority note
// on tryBuildWalletSuggestedAction below.
const WALLET_INTENT_PATTERN = /\b(add|log|record|track|set up|setup|create|top ?up)\b/i;
const WALLET_MENTION_PATTERN = /\bwallets?\b/i;
const WALLET_KEYWORDS: Record<WalletType, string[]> = {
  gcash: ['gcash'],
  credit_card: ['credit card', 'credit_card', 'creditcard'],
  debit_card: ['debit card', 'debit_card', 'debitcard'],
  cash: ['cash'],
  online_money: ['online money', 'online_money', 'paymaya', 'maya', 'e-wallet', 'ewallet'],
  bitcoin: ['bitcoin', 'btc', 'crypto'],
  other: [],
};

function findWalletTypeByKeyword(message: string): WalletType | null {
  const lower = message.toLowerCase();
  for (const [type, keywords] of Object.entries(WALLET_KEYWORDS)) {
    if (keywords.some((keyword) => lower.includes(keyword))) {
      return type as WalletType;
    }
  }
  return null;
}

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

interface MerchantMatch {
  category: Category;
  subcategory: Subcategory;
}

/**
 * Checked before the plain category-keyword match in tryBuildSuggestedAction
 * so a recognized merchant auto-fills both category AND subcategory (e.g.
 * "add 300 jollibee" -> Food > Fast Food). Checks MERCHANT_SUBCATEGORY_MAP
 * first — it wins even over a subcategory of the same literal name (see that
 * constant's doc comment) — then falls back to a generic scan for any of the
 * user's real subcategory names mentioned directly (covers most of the
 * brand-named defaults, e.g. "Netflix", "Meralco", "Uber", without needing an
 * explicit mapping entry for each one). Subcategory names under 4 characters
 * are skipped in the generic scan to avoid short-word false positives (e.g.
 * "Bus").
 */
function findMerchantMatch(message: string, context: ChatContextData): MerchantMatch | null {
  const lower = message.toLowerCase();

  for (const mapping of MERCHANT_SUBCATEGORY_MAP) {
    if (!lower.includes(mapping.keyword)) {
      continue;
    }
    const category = context.categories.find((c) => c.name === mapping.categoryName);
    const subcategory = context.subcategories.find(
      (s) => s.categoryId === category?.id && s.name === mapping.subcategoryName
    );
    if (category && subcategory) {
      return { category, subcategory };
    }
  }

  for (const subcategory of context.subcategories) {
    if (subcategory.name.length < 4 || !lower.includes(subcategory.name.toLowerCase())) {
      continue;
    }
    const category = context.categories.find((c) => c.id === subcategory.categoryId);
    if (category) {
      return { category, subcategory };
    }
  }

  return null;
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

function extractAlertThreshold(message: string): number {
  const match = message.match(ALERT_THRESHOLD_PATTERN);
  if (!match) {
    return DEFAULT_ALERT_THRESHOLD_PCT;
  }
  const pct = Number(match[1]);
  return pct > 0 && pct <= 100 ? pct : DEFAULT_ALERT_THRESHOLD_PCT;
}

/**
 * Checked before both the budget and expense builders so a message like "add
 * 1000 to my wallet gcash" — which also matches the expense ADD_INTENT_PATTERN
 * — is routed to a wallet suggestion instead of asking "which category?"
 * (wallets have no category). Triggers on either the literal word "wallet" or
 * a recognized wallet-type name (gcash, cash, credit card, ...). If the
 * message also names a real category and doesn't say "wallet" explicitly,
 * that's treated as an incidental payment-method mention on an expense
 * (e.g. "add 500 for food using gcash") and this returns null so the expense
 * flow handles it instead.
 */
function tryBuildWalletSuggestedAction(message: string, context: ChatContextData): string | null {
  if (!WALLET_INTENT_PATTERN.test(message)) {
    return null;
  }
  const mentionsWallet = WALLET_MENTION_PATTERN.test(message);
  const walletType = findWalletTypeByKeyword(message);
  if (!mentionsWallet && (!walletType || findCategoryByKeyword(message, context.categories))) {
    return null;
  }

  const amount = extractAmount(message);
  if (amount === null) {
    return null;
  }

  if (!walletType) {
    const names = WALLET_TYPE_OPTIONS.map((o) => o.label).join(', ');
    return (
      `Sure — I can add ${formatCurrency(amount, context.currency)} to a wallet. ` +
      `Which wallet type? (${names})`
    );
  }

  const label = WALLET_TYPE_OPTIONS.find((o) => o.value === walletType)?.label ?? walletType;
  return (
    `Got it! Here's what I'll add:\n\n` +
    `[SUGGEST_ACTION] wallet:₱${amount} type:${walletType} name:${label} [/SUGGEST_ACTION]`
  );
}

/**
 * Checked before `tryBuildSuggestedAction` so a message like "add 3000 budget
 * to food" — which also matches the expense ADD_INTENT_PATTERN — is routed to
 * a budget suggestion instead of an expense one. The word "budget" is what
 * disambiguates intent here, matching the same word the real system prompt
 * (see aiContext.ts's buildSystemPrompt) tells the model to key off of.
 */
function tryBuildBudgetSuggestedAction(message: string, context: ChatContextData): string | null {
  if (!BUDGET_KEYWORD_PATTERN.test(message) || !BUDGET_INTENT_PATTERN.test(message)) {
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
      `Sure — I can set a ${formatCurrency(amount, context.currency)} budget. ` +
      `Which category should it apply to? (${names})`
    );
  }

  const alertThreshold = extractAlertThreshold(message);
  return (
    `Got it! Here's the budget I'll set:\n\n` +
    `[SUGGEST_ACTION] budget:₱${amount} category:${category.name} alertThreshold:${alertThreshold} [/SUGGEST_ACTION]`
  );
}

function tryBuildSuggestedAction(message: string, context: ChatContextData): string | null {
  if (!ADD_INTENT_PATTERN.test(message)) {
    return null;
  }
  const amount = extractAmount(message);
  if (amount === null) {
    return null;
  }

  const merchant = findMerchantMatch(message, context);
  if (merchant) {
    const description = extractDescription(message, merchant.category);
    return (
      `Got it! Here's what I'll add:\n\n` +
      `[SUGGEST_ACTION] expense:₱${amount} category:${merchant.category.name} ` +
      `subcategory:${merchant.subcategory.name} description:${description} [/SUGGEST_ACTION]`
    );
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

/** The soonest-due recurring bill within RECURRING_DAYS_AHEAD, with its real description if set. */
function nextUpcomingBill(
  context: ChatContextData
): { label: string; amount: number; dueDate: string } | null {
  const upcoming = upcomingRecurringExpenses(
    context.recurringTemplates,
    context.expenses,
    context.categories,
    context.today,
    RECURRING_DAYS_AHEAD
  );
  if (upcoming.length === 0) {
    return null;
  }
  const next = upcoming[0];
  const template = context.recurringTemplates.find((t) => t.id === next.templateId);
  return { label: template?.description || next.categoryName, amount: next.amount, dueDate: next.dueDate };
}

/** #9 Payday countdown: days until payday + overall budget usage so far. */
function paydayAnswer(context: ChatContextData): string {
  const [y, m, d] = context.today.split('-').map(Number);
  const now = new Date(y, m - 1, d);
  const days = daysUntilPayday(context.payday, now);
  const dayText =
    days === 0
      ? 'Payday is today! 🎉'
      : `${days} day${days === 1 ? '' : 's'} until payday (${formatDate(nextPaydayDate(context.payday, now))}).`;

  const usage = overallBudgetUsage(context.budgets, context.expenses, context.month);
  if (usage === null) {
    return `${dayText} No budgets set yet to track against.`;
  }
  return `${dayText} You've spent ${Math.round(usage * 100)}% of your monthly budget so far.`;
}

/** #2 Recurring expense reminders: what's due within the next 7 days. */
function recurringAnswer(context: ChatContextData): string {
  const next = nextUpcomingBill(context);
  if (!next) {
    return 'No bills due in the next 7 days. 🎉';
  }

  const upcoming = upcomingRecurringExpenses(
    context.recurringTemplates,
    context.expenses,
    context.categories,
    context.today,
    RECURRING_DAYS_AHEAD
  );
  const total = upcoming.reduce((sum, u) => sum + u.amount, 0);
  return (
    `${next.label} ${formatCurrency(next.amount, context.currency)} due ${formatDate(next.dueDate)}. ` +
    `You have ${upcoming.length} bill${upcoming.length === 1 ? '' : 's'} due this week: ` +
    `${formatCurrency(total, context.currency)} total.`
  );
}

/** #11 Savings opportunity detection: total recurring subscriptions to review. */
function savingsAnswer(context: ChatContextData): string {
  const recurring = context.recurringTemplates.filter((t) => t.isRecurring);
  if (recurring.length === 0) {
    return "You don't have any recurring subscriptions set up to review.";
  }
  const total = recurring.reduce((sum, t) => sum + t.amount, 0);
  const names = recurring
    .slice(0, 2)
    .map((t) => `${t.description || 'Subscription'} ${formatCurrency(t.amount, context.currency)}`)
    .join(', ');
  const suffix = recurring.length > 2 ? ', etc.' : '';
  return (
    `Your recurring subscriptions total ${formatCurrency(total, context.currency)}/month ` +
    `(${names}${suffix}). Review if all are still needed.`
  );
}

function describeTrend(pctChange: number | null): string {
  if (pctChange === null) {
    return '.';
  }
  const arrow = pctChange >= 0 ? '↑' : '↓';
  return ` (${pctChange >= 0 ? '+' : ''}${Math.round(pctChange)}% ${arrow}).`;
}

/** #5 Spending trends: this week vs. last week, by category if one is named, else overall. */
function trendsAnswer(message: string, context: ChatContextData): string {
  const category = findCategoryByKeyword(message, context.categories);
  if (category) {
    const { thisWeekTotal, lastWeekTotal, pctChange } = weekOverWeekForCategory(
      context.expenses,
      context.categories,
      category.id,
      context.today
    );
    return (
      `${category.name} ${formatCurrency(thisWeekTotal, context.currency)} this week vs ` +
      `${formatCurrency(lastWeekTotal, context.currency)} last week${describeTrend(pctChange)}`
    );
  }

  const { thisWeekTotal, lastWeekTotal, pctChange } = weekOverWeekTotal(context.expenses, context.today);
  return (
    `You've spent ${formatCurrency(thisWeekTotal, context.currency)} this week vs ` +
    `${formatCurrency(lastWeekTotal, context.currency)} last week${describeTrend(pctChange)}`
  );
}

/** #6 Daily summary: yesterday's spend by category. */
function yesterdaySummaryAnswer(context: ChatContextData): string {
  const yesterday = shiftDate(context.today, -1);
  const dayExpenses = context.expenses.filter((e) => e.date === yesterday);
  if (dayExpenses.length === 0) {
    return "You didn't log any expenses yesterday.";
  }

  const total = dayExpenses.reduce((sum, e) => sum + e.amount, 0);
  const byCategory = new Map<string, number>();
  for (const e of dayExpenses) {
    byCategory.set(e.categoryId, (byCategory.get(e.categoryId) ?? 0) + e.amount);
  }
  const parts = [...byCategory.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([categoryId, amount]) => {
      const name = context.categories.find((c) => c.id === categoryId)?.name ?? 'Uncategorized';
      return `${name} ${formatCurrency(amount, context.currency)}`;
    });

  return (
    `Yesterday ${formatCurrency(total, context.currency)} on ${dayExpenses.length} ` +
    `transaction${dayExpenses.length === 1 ? '' : 's'}: ${parts.join(', ')}`
  );
}

/** #6 Weekly summary: this week's spend by category, with percentage share. */
function weekSummaryAnswer(context: ChatContextData): string {
  const start = shiftDate(context.today, -6);
  const weekExpenses = context.expenses.filter((e) => e.date >= start && e.date <= context.today);
  if (weekExpenses.length === 0) {
    return "You haven't logged any expenses this week.";
  }

  const total = weekExpenses.reduce((sum, e) => sum + e.amount, 0);
  const byCategory = new Map<string, number>();
  for (const e of weekExpenses) {
    byCategory.set(e.categoryId, (byCategory.get(e.categoryId) ?? 0) + e.amount);
  }
  const parts = [...byCategory.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([categoryId, amount]) => {
      const name = context.categories.find((c) => c.id === categoryId)?.name ?? 'Uncategorized';
      const pct = total > 0 ? Math.round((amount / total) * 100) : 0;
      return `${name} ${formatCurrency(amount, context.currency)} (${pct}%)`;
    });

  return `This week ${formatCurrency(total, context.currency)} spent: ${parts.join(', ')}`;
}

/** #7 Best practices for next month, derived from this month's budget-vs-actual. */
function bestPracticesAnswer(context: ChatContextData): string {
  const rows = budgetVsActual(context.budgets, context.expenses, context.categories, context.month);
  if (rows.length === 0) {
    return "You haven't set any budgets yet — set one to get next month's tips.";
  }

  const parts = rows.map((row) => {
    if (row.isOverLimit) {
      const over = formatCurrency(row.actual - row.budget.limitAmount, context.currency);
      const limit = formatCurrency(row.budget.limitAmount, context.currency);
      return `${row.categoryName} over budget by ${over} — try to keep under ${limit} next month`;
    }
    const actual = formatCurrency(row.actual, context.currency);
    const limit = formatCurrency(row.budget.limitAmount, context.currency);
    return `${row.categoryName} on track (${actual}/${limit})`;
  });

  return `${parts.join('. ')}.`;
}

/** #8 Category insights: top 3 categories by share of spend + zero-spend categories. */
function categoryInsightsAnswer(context: ChatContextData): string {
  const totals = categoryTotalsForMonth(context.expenses, context.categories, context.month);
  if (totals.length === 0) {
    return `No expenses recorded for ${context.monthLabel} yet.`;
  }

  const grandTotal = totals.reduce((sum, row) => sum + row.total, 0);
  const top = totals.slice(0, 3).map((row) => {
    const pct = grandTotal > 0 ? Math.round((row.total / grandTotal) * 100) : 0;
    return `${row.name} ${pct}%`;
  });
  const spentIds = new Set(totals.map((row) => row.categoryId));
  const zeroSpend = context.categories.filter((c) => !spentIds.has(c.id)).map((c) => c.name);

  let response = `Top categories: ${top.join(', ')}.`;
  if (zeroSpend.length > 0) {
    response += ` No spending on: ${zeroSpend.join(', ')}.`;
  }
  return response;
}

/** #10 Payment method insights: which wallet gets used most, by transaction count. */
function paymentMethodAnswer(context: ChatContextData): string {
  const monthExpenses = context.expenses.filter((e) => e.date.startsWith(context.month));
  if (monthExpenses.length === 0) {
    return `No transactions recorded for ${context.monthLabel} yet.`;
  }

  const counts = new Map<string, number>();
  for (const e of monthExpenses) {
    const key = e.walletId ?? 'unassigned';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const rows = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([walletId, count]) => {
      const name =
        walletId === 'unassigned'
          ? 'Unassigned'
          : context.wallets.find((w) => w.id === walletId)?.name ?? 'Unknown wallet';
      return { name, pct: Math.round((count / monthExpenses.length) * 100) };
    });

  const [topRow, ...rest] = rows;
  const restText = rest.map((r) => `${r.name} ${r.pct}%`).join(', ');
  return `You mostly use ${topRow.name} (${topRow.pct}% of transactions).${restText ? ` ${restText}.` : ''}`;
}

/** #12 Budget vs. actuals: a full per-category comparison grid, one row per budgeted category. */
function budgetComparisonAnswer(context: ChatContextData): string {
  const rows = budgetVsActual(context.budgets, context.expenses, context.categories, context.month);
  if (rows.length === 0) {
    return `You haven't set any budgets for ${context.monthLabel} yet.`;
  }

  const lines = rows.map((row) => {
    const pct =
      row.budget.limitAmount > 0 ? Math.round((row.actual / row.budget.limitAmount) * 100) : 0;
    const tail = row.isOverLimit
      ? `${formatCurrency(row.actual - row.budget.limitAmount, context.currency)} over`
      : `${formatCurrency(row.remaining, context.currency)} left`;
    const actual = formatCurrency(row.actual, context.currency);
    const limit = formatCurrency(row.budget.limitAmount, context.currency);
    return `${row.categoryName}: ${actual} spent of ${limit} (${pct}%) — ${tail}`;
  });

  return lines.join('\n');
}

/** Proactive greeting: leads with the most urgent insight before inviting a full breakdown. */
function greetingAnswer(context: ChatContextData): string {
  const greeting = greetingForNow();
  const rows = budgetVsActual(context.budgets, context.expenses, context.categories, context.month);
  const worst = [...rows].sort(
    (a, b) => b.actual / b.budget.limitAmount - a.actual / a.budget.limitAmount
  )[0];
  const bill = nextUpcomingBill(context);

  if (worst) {
    const pct =
      worst.budget.limitAmount > 0 ? Math.round((worst.actual / worst.budget.limitAmount) * 100) : 0;
    const remaining = formatCurrency(Math.abs(worst.remaining), context.currency);
    const status = worst.isOverLimit ? `over by ${remaining}` : `${remaining} left`;
    let response = `${greeting} You're at ${pct}% of your ${worst.categoryName} budget (${status}).`;
    if (bill) {
      response += ` Also, ${bill.label} is due ${formatDate(bill.dueDate)}.`;
    }
    return `${response} Want a full breakdown?`;
  }

  if (bill) {
    return (
      `${greeting} ${bill.label} ${formatCurrency(bill.amount, context.currency)} is due ` +
      `${formatDate(bill.dueDate)}. Want a full breakdown?`
    );
  }

  return `${greeting} Ask me about your spending, budgets, wallets, or loans this month.`;
}

/** Pattern-matches keywords in `message` and returns a templated, context-aware reply. */
export function generateMockResponse(message: string, context: ChatContextData): string {
  const walletAction = tryBuildWalletSuggestedAction(message, context);
  if (walletAction) {
    return walletAction;
  }

  const budgetAction = tryBuildBudgetSuggestedAction(message, context);
  if (budgetAction) {
    return budgetAction;
  }

  const suggestedAction = tryBuildSuggestedAction(message, context);
  if (suggestedAction) {
    return suggestedAction;
  }

  const lower = message.toLowerCase();

  if (GREETING_PATTERN.test(lower)) {
    return greetingAnswer(context);
  }
  if (PAYDAY_PATTERN.test(lower)) {
    return paydayAnswer(context);
  }
  if (RECURRING_PATTERN.test(lower)) {
    return recurringAnswer(context);
  }
  if (SAVINGS_PATTERN.test(lower)) {
    return savingsAnswer(context);
  }
  if (TRENDS_PATTERN.test(lower)) {
    return trendsAnswer(message, context);
  }
  if (YESTERDAY_PATTERN.test(lower)) {
    return yesterdaySummaryAnswer(context);
  }
  if (WEEK_SUMMARY_PATTERN.test(lower)) {
    return weekSummaryAnswer(context);
  }
  if (BEST_PRACTICES_PATTERN.test(lower)) {
    return bestPracticesAnswer(context);
  }
  if (BUDGET_COMPARISON_PATTERN.test(lower)) {
    return budgetComparisonAnswer(context);
  }
  if (CATEGORY_INSIGHTS_PATTERN.test(lower)) {
    return categoryInsightsAnswer(context);
  }
  if (PAYMENT_METHOD_PATTERN.test(lower)) {
    return paymentMethodAnswer(context);
  }

  const category = findCategoryByKeyword(message, context.categories);
  if (category) {
    return categoryAnswer(category, context);
  }

  if (/\b(wallet|balance|net worth|how much do i have)\b/.test(lower)) {
    return walletAnswer(context);
  }
  if (/\bloan/.test(lower)) {
    return loanAnswer(context);
  }
  if (/\bbudget/.test(lower)) {
    return budgetAnswer(context);
  }
  if (/\b(spend|spent|total|overview)\b|this month/.test(lower)) {
    return totalAnswer(context);
  }

  return FALLBACK_RESPONSE;
}
