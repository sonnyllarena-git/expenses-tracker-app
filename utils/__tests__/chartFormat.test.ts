import { formatYAxisLabel } from '../chartFormat';

describe('formatYAxisLabel', () => {
  it('adds thousands separators', () => {
    expect(formatYAxisLabel('9080')).toBe('9,080');
    expect(formatYAxisLabel('1000000')).toBe('1,000,000');
  });

  it('leaves small numbers unchanged', () => {
    expect(formatYAxisLabel('80')).toBe('80');
    expect(formatYAxisLabel('0')).toBe('0');
  });

  it('returns non-numeric labels as-is', () => {
    expect(formatYAxisLabel('N/A')).toBe('N/A');
  });
});
