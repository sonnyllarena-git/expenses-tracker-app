import { WALLET_TYPE_OPTIONS } from '@/constants/wallets';
import type { Category, Subcategory, WalletType } from '@/types';

export interface ParsedExpenseAction {
  kind: 'expense';
  amountText: string;
  categoryName: string;
  /** Set only when the AI recognized a merchant/subcategory; optional and best-effort. */
  subcategoryName?: string;
  description: string;
}

export interface ParsedBudgetAction {
  kind: 'budget';
  amountText: string;
  categoryName: string;
  alertThresholdText: string;
}

export interface ParsedWalletAction {
  kind: 'wallet';
  amountText: string;
  walletTypeText: string;
  walletName: string;
}

export type ParsedSuggestedAction = ParsedExpenseAction | ParsedBudgetAction | ParsedWalletAction;

export interface ParsedAssistantMessage {
  /** Message text with the [SUGGEST_ACTION] block stripped out, for display. */
  displayText: string;
  action: ParsedSuggestedAction | null;
}

const BUDGET_ACTION_PATTERN =
  /\[SUGGEST_ACTION\]\s*budget:\s*₱?\s*([\d,]+(?:\.\d+)?)\s*category:\s*(.*?)\s*alertThreshold:\s*(\d+(?:\.\d+)?)\s*\[\/SUGGEST_ACTION\]/is;
const EXPENSE_ACTION_PATTERN =
  /\[SUGGEST_ACTION\]\s*expense:\s*₱?\s*([\d,]+(?:\.\d+)?)\s*category:\s*(.*?)\s*description:\s*(.*?)\s*\[\/SUGGEST_ACTION\]/is;
// Tried before EXPENSE_ACTION_PATTERN whenever the AI recognized a merchant —
// checking the plain pattern first would swallow "subcategory:[name]" into
// the non-greedy category capture instead of splitting it out.
const EXPENSE_WITH_SUBCATEGORY_ACTION_PATTERN =
  /\[SUGGEST_ACTION\]\s*expense:\s*₱?\s*([\d,]+(?:\.\d+)?)\s*category:\s*(.*?)\s*subcategory:\s*(.*?)\s*description:\s*(.*?)\s*\[\/SUGGEST_ACTION\]/is;
const WALLET_ACTION_PATTERN =
  /\[SUGGEST_ACTION\]\s*wallet:\s*₱?\s*([\d,]+(?:\.\d+)?)\s*type:\s*(.*?)\s*name:\s*(.*?)\s*\[\/SUGGEST_ACTION\]/is;

/**
 * Extracts a [SUGGEST_ACTION] block (per the system prompt's format) from an
 * assistant reply. Checked in this order because both patterns can appear in
 * a "budget:" message's category text loosely — budget is the more specific
 * tag name, so it's tried first. Wallet is checked before expense since its
 * tag name ("wallet:") is distinct but its amount/prefix shape is otherwise
 * identical.
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

  const walletMatch = content.match(WALLET_ACTION_PATTERN);
  if (walletMatch) {
    const [fullMatch, amountText, walletTypeText, walletName] = walletMatch;
    return {
      displayText: content.replace(fullMatch, '').trim(),
      action: {
        kind: 'wallet',
        amountText,
        walletTypeText: walletTypeText.trim(),
        walletName: walletName.trim(),
      },
    };
  }

  const expenseWithSubcategoryMatch = content.match(EXPENSE_WITH_SUBCATEGORY_ACTION_PATTERN);
  if (expenseWithSubcategoryMatch) {
    const [fullMatch, amountText, categoryName, subcategoryName, description] =
      expenseWithSubcategoryMatch;
    return {
      displayText: content.replace(fullMatch, '').trim(),
      action: {
        kind: 'expense',
        amountText,
        categoryName: categoryName.trim(),
        subcategoryName: subcategoryName.trim(),
        description: description.trim(),
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
  /** Null unless the AI recognized a merchant matching one of the category's real subcategories. */
  subcategoryId: string | null;
  subcategoryName: string | null;
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

export interface ValidWalletAction {
  valid: true;
  kind: 'wallet';
  amount: number;
  walletType: WalletType;
  walletName: string;
}

export type ValidSuggestedAction = ValidExpenseAction | ValidBudgetAction | ValidWalletAction;

export interface InvalidSuggestedAction {
  valid: false;
  error: string;
}

export type ValidatedSuggestedAction = ValidSuggestedAction | InvalidSuggestedAction;

const DEFAULT_ALERT_THRESHOLD = 0.8;

/**
 * Never guesses: an amount that isn't a positive number, a category that
 * doesn't match one of the user's real categories, or a wallet type that
 * isn't one of the supported types, is reported as invalid rather than saved
 * with a best-effort fallback. Wallet actions have no category — they're
 * validated against WALLET_TYPE_OPTIONS instead.
 */
export function validateSuggestedAction(
  action: ParsedSuggestedAction,
  categories: Category[],
  subcategories: Subcategory[] = []
): ValidatedSuggestedAction {
  const amount = Number(action.amountText.replace(/,/g, ''));
  if (!Number.isFinite(amount) || amount <= 0) {
    return { valid: false, error: 'The suggested amount is not a valid number.' };
  }

  if (action.kind === 'wallet') {
    const walletOption = WALLET_TYPE_OPTIONS.find(
      (o) =>
        o.value.toLowerCase() === action.walletTypeText.toLowerCase() ||
        o.label.toLowerCase() === action.walletTypeText.toLowerCase()
    );
    if (!walletOption) {
      return { valid: false, error: `Wallet type "${action.walletTypeText}" doesn't exist.` };
    }
    return {
      valid: true,
      kind: 'wallet',
      amount,
      walletType: walletOption.value,
      walletName: action.walletName || walletOption.label,
    };
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

  // Best-effort only: an unrecognized subcategory name is silently omitted
  // rather than invalidating the whole expense suggestion — subcategory is
  // optional/additive, unlike category which is required above.
  let subcategoryId: string | null = null;
  let subcategoryName: string | null = null;
  if (action.subcategoryName) {
    const subcategory = subcategories.find(
      (s) =>
        s.categoryId === category.id && s.name.toLowerCase() === action.subcategoryName!.toLowerCase()
    );
    if (subcategory) {
      subcategoryId = subcategory.id;
      subcategoryName = subcategory.name;
    }
  }

  return {
    valid: true,
    kind: 'expense',
    amount,
    categoryId: category.id,
    categoryName: category.name,
    subcategoryId,
    subcategoryName,
    description: action.description || `${category.name} expense`,
  };
}
