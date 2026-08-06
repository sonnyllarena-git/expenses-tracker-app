import type { Category } from '@/types';

export interface ParsedSuggestedAction {
  amountText: string;
  categoryName: string;
  description: string;
}

export interface ParsedAssistantMessage {
  /** Message text with the [SUGGEST_ACTION] block stripped out, for display. */
  displayText: string;
  action: ParsedSuggestedAction | null;
}

const SUGGEST_ACTION_PATTERN =
  /\[SUGGEST_ACTION\]\s*expense:\s*₱?\s*([\d,]+(?:\.\d+)?)\s*category:\s*(.*?)\s*description:\s*(.*?)\s*\[\/SUGGEST_ACTION\]/is;

/** Extracts a [SUGGEST_ACTION] block (per the system prompt's format) from an assistant reply. */
export function parseAssistantMessage(content: string): ParsedAssistantMessage {
  const match = content.match(SUGGEST_ACTION_PATTERN);
  if (!match) {
    return { displayText: content.trim(), action: null };
  }

  const [fullMatch, amountText, categoryName, description] = match;
  return {
    displayText: content.replace(fullMatch, '').trim(),
    action: { amountText, categoryName: categoryName.trim(), description: description.trim() },
  };
}

export interface ValidSuggestedAction {
  valid: true;
  amount: number;
  categoryId: string;
  categoryName: string;
  description: string;
}

export interface InvalidSuggestedAction {
  valid: false;
  error: string;
}

export type ValidatedSuggestedAction = ValidSuggestedAction | InvalidSuggestedAction;

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

  return {
    valid: true,
    amount,
    categoryId: category.id,
    categoryName: category.name,
    description: action.description || `${category.name} expense`,
  };
}
