import { parseAssistantMessage, validateSuggestedAction } from '../suggestedAction';
import type { Category } from '@/types';

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
];

describe('parseAssistantMessage', () => {
  it('extracts the suggested expense action and strips the tag from display text', () => {
    const content =
      "Got it! Here's what I'll add:\n\n" +
      '[SUGGEST_ACTION] expense:₱500 category:Food description:Coffee [/SUGGEST_ACTION]';
    const parsed = parseAssistantMessage(content);
    expect(parsed.displayText).toBe("Got it! Here's what I'll add:");
    expect(parsed.action).toEqual({
      kind: 'expense',
      amountText: '500',
      categoryName: 'Food',
      description: 'Coffee',
    });
  });

  it('handles comma-formatted amounts', () => {
    const content =
      '[SUGGEST_ACTION] expense:₱1,500.50 category:Food description:Groceries [/SUGGEST_ACTION]';
    expect(parseAssistantMessage(content).action?.amountText).toBe('1,500.50');
  });

  it('returns a null action for plain text with no suggestion block', () => {
    const parsed = parseAssistantMessage('You spent ₱500 on Food this month.');
    expect(parsed.action).toBeNull();
    expect(parsed.displayText).toBe('You spent ₱500 on Food this month.');
  });

  it('extracts the suggested budget action and strips the tag from display text', () => {
    const content =
      "Got it! Here's the budget I'll set:\n\n" +
      '[SUGGEST_ACTION] budget:₱5000 category:Health alertThreshold:80 [/SUGGEST_ACTION]';
    const parsed = parseAssistantMessage(content);
    expect(parsed.displayText).toBe("Got it! Here's the budget I'll set:");
    expect(parsed.action).toEqual({
      kind: 'budget',
      amountText: '5000',
      categoryName: 'Health',
      alertThresholdText: '80',
    });
  });
});

describe('validateSuggestedAction', () => {
  it('resolves a valid expense action to its category id', () => {
    const result = validateSuggestedAction(
      { kind: 'expense', amountText: '500', categoryName: 'Food', description: 'Coffee' },
      categories
    );
    expect(result).toEqual({
      valid: true,
      kind: 'expense',
      amount: 500,
      categoryId: 'cat-food',
      categoryName: 'Food',
      description: 'Coffee',
    });
  });

  it('falls back to a generic description when none was given', () => {
    const result = validateSuggestedAction(
      { kind: 'expense', amountText: '500', categoryName: 'Food', description: '' },
      categories
    );
    expect(result.valid && result.kind === 'expense' && result.description).toBe('Food expense');
  });

  it('rejects a non-numeric or non-positive amount', () => {
    const result = validateSuggestedAction(
      { kind: 'expense', amountText: 'lots', categoryName: 'Food', description: '' },
      categories
    );
    expect(result).toEqual({ valid: false, error: 'The suggested amount is not a valid number.' });
  });

  it('rejects a category that does not exist, case-insensitively matching real ones otherwise', () => {
    const missing = validateSuggestedAction(
      { kind: 'expense', amountText: '500', categoryName: 'Rent', description: '' },
      categories
    );
    expect(missing).toEqual({ valid: false, error: 'Category "Rent" doesn\'t exist.' });

    const caseInsensitive = validateSuggestedAction(
      { kind: 'expense', amountText: '500', categoryName: 'food', description: '' },
      categories
    );
    expect(caseInsensitive.valid).toBe(true);
  });

  it('resolves a valid budget action, converting the alert threshold percentage to a fraction', () => {
    const result = validateSuggestedAction(
      { kind: 'budget', amountText: '5000', categoryName: 'Food', alertThresholdText: '80' },
      categories
    );
    expect(result).toEqual({
      valid: true,
      kind: 'budget',
      amount: 5000,
      categoryId: 'cat-food',
      categoryName: 'Food',
      alertThreshold: 0.8,
    });
  });

  it('falls back to an 80% alert threshold when out of range', () => {
    const result = validateSuggestedAction(
      { kind: 'budget', amountText: '5000', categoryName: 'Food', alertThresholdText: '150' },
      categories
    );
    expect(result.valid && result.kind === 'budget' && result.alertThreshold).toBe(0.8);
  });
});
