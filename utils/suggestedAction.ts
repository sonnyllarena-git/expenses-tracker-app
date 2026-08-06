import type { Category } from '@/types';

export interface ParsedExpenseAction {
  kind: 'expense';
  amountText: string;
  categoryName: string;
  description: string;
}

export interface ParsedBudgetAction {
  kind: 'budget';
  amountText: string;
  categoryName: string;
  alertThresholdText: string;
}

export type ParsedSuggestedAction = ParsedExpenseAction | ParsedBudgetAction;

export interface ParsedAssistantMessage {
  /** Message text with the [SUGGEST_ACTION] block stripped out, for display. */
  displayText: string;
  action: ParsedSuggestedAction | null;
}

const BUDGET_ACTION_PATTERN =
  /\[SUGGEST_ACTION\]\s*budget:\s*₱?\s*([\d,]+(?:\.\d+)?)\s*category:\s*(.*?)\s*alertThreshold:\s*(\d+(?:\.\d+)?)\s*\[\/SUGGEST_ACTION\]/is;
const EXPENSE_ACTION_PATTERN =
  /\[SUGGEST_ACTION\]\s*expense:\s*₱?\s*([\d,]+(?:\.\d+)?)\s*category:\s*(.*?)\s*description:\s*(.*?)\s*\[\/SUGGEST_ACTION\]/is;

/**
 * Extracts a [SUGGEST_ACTION] block (per the system prompt's format) from an
 * assistant reply. Checked in this order because both patterns can appear in
 * a "budget:" message's category text loosely — budget is the more specific
 * tag name, so it's tried first.
 */
export function parseAssistantMessage(content: string): ParsedAssistantMessage {
  const budgetMatch = content.match(BUDGET_ACTION_PATTERN);
  if (budgetMatch) {
    const [fullMatch, amountText, categoryName, alertThresholdText] = budgetMatch;
    return {
      displayText: content.replace(fullMatch, '').trim(),
      action: {
        kind: 'budget',
        amountText,
        categoryName: categoryName.trim(),
        alertThresholdText,
      },
    };
  }

  const expenseMatch = content.match(EXPENSE_ACTION_PATTERN);
  if (expenseMatch) {
    const [fullMatch, amountText, categoryName, description] = expenseMatch;
    return {
      displayText: content.replace(fullMatch, '').trim(),
      action: {
        kind: 'expense',
        amountText,
        categoryName: categoryName.trim(),
        description: description.trim(),
      },
    };
  }

  return { displayText: content.trim(), action: null };
}

export interface ValidExpenseAction {
  valid: true;
  kind: 'expense';
  amount: number;
  categoryId: string;
  categoryName: string;
  description: string;
}

export interface ValidBudgetAction {
  valid: true;
  kind: 'budget';
  amount: number;
  categoryId: string;
  categoryName: string;
  /** Fraction 0-1, matching the `budgets.alertThreshold` column (e.g. 80% -> 0.8). */
  alertThreshold: number;
}

export type ValidSuggestedAction = ValidExpenseAction | ValidBudgetAction;

export interface InvalidSuggestedAction {
  valid: false;
  error: string;
}

export type ValidatedSuggestedAction = ValidSuggestedAction | InvalidSuggestedAction;

const DEFAULT_ALERT_THRESHOLD = 0.8;

/**
 * Never guesses: an amount that isn't a positive number, or a category that
 * doesn't match one of the user's real categories, is reported as invalid
 * rather than saved with a best-effort fallback.
 */
export function validateSuggestedAction(
  action: ParsedSuggestedAction,
  categories: Category[]
): ValidatedSuggestedAction {
  const amount = Number(action.amountText.replace(/,/g, ''));
  if (!Number.isFinite(amount) || amount <= 0) {
    return { valid: false, error: 'The suggested amount is not a valid number.' };
  }

  const category = categories.find(
    (c) => c.name.toLowerCase() === action.categoryName.toLowerCase()
  );
  if (!category) {
    return { valid: false, error: `Category "${action.categoryName}" doesn't exist.` };
  }

  if (action.kind === 'budget') {
    const pct = Number(action.alertThresholdText);
    const alertThreshold = pct > 0 && pct <= 100 ? pct / 100 : DEFAULT_ALERT_THRESHOLD;
    return {
      valid: true,
      kind: 'budget',
      amount,
      categoryId: category.id,
      categoryName: category.name,
      alertThreshold,
    };
  }

  return {
    valid: true,
    kind: 'expense',
    amount,
    categoryId: category.id,
    categoryName: category.name,
    description: action.description || `${category.name} expense`,
  };
}
