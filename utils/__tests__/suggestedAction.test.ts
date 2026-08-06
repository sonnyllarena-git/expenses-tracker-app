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
  it('extracts the suggested action and strips the tag from display text', () => {
    const content =
      "Got it! Here's what I'll add:\n\n" +
      '[SUGGEST_ACTION] expense:₱500 category:Food description:Coffee [/SUGGEST_ACTION]';
    const parsed = parseAssistantMessage(content);
    expect(parsed.displayText).toBe("Got it! Here's what I'll add:");
    expect(parsed.action).toEqual({
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
});

describe('validateSuggestedAction', () => {
  it('resolves a valid action to its category id', () => {
    const result = validateSuggestedAction(
      { amountText: '500', categoryName: 'Food', description: 'Coffee' },
      categories
    );
    expect(result).toEqual({
      valid: true,
      amount: 500,
      categoryId: 'cat-food',
      categoryName: 'Food',
      description: 'Coffee',
    });
  });

  it('falls back to a generic description when none was given', () => {
    const result = validateSuggestedAction(
      { amountText: '500', categoryName: 'Food', description: '' },
      categories
    );
    expect(result.valid && result.description).toBe('Food expense');
  });

  it('rejects a non-numeric or non-positive amount', () => {
    const result = validateSuggestedAction(
      { amountText: 'lots', categoryName: 'Food', description: '' },
      categories
    );
    expect(result).toEqual({ valid: false, error: 'The suggested amount is not a valid number.' });
  });

  it('rejects a category that does not exist, case-insensitively matching real ones otherwise', () => {
    const missing = validateSuggestedAction(
      { amountText: '500', categoryName: 'Rent', description: '' },
      categories
    );
    expect(missing).toEqual({ valid: false, error: 'Category "Rent" doesn\'t exist.' });

    const caseInsensitive = validateSuggestedAction(
      { amountText: '500', categoryName: 'food', description: '' },
      categories
    );
    expect(caseInsensitive.valid).toBe(true);
  });
});
