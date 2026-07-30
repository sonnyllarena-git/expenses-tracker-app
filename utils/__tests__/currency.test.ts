import { formatCurrency } from '../currency';

describe('formatCurrency', () => {
  it('formats an amount with the given currency code', () => {
    expect(formatCurrency(1234.5, 'PHP')).toBe('₱1,234.50');
  });

  it('formats zero correctly', () => {
    expect(formatCurrency(0, 'USD')).toBe('$0.00');
  });
});
