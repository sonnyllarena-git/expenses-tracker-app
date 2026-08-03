import { daysInMonth } from '../date';

describe('daysInMonth', () => {
  it('returns 29 for a leap-year February', () => {
    expect(daysInMonth('2024-02')).toBe(29);
  });

  it('returns 28 for a non-leap-year February', () => {
    expect(daysInMonth('2026-02')).toBe(28);
  });

  it('returns 30 for a 30-day month', () => {
    expect(daysInMonth('2026-04')).toBe(30);
  });

  it('returns 31 for a 31-day month', () => {
    expect(daysInMonth('2026-01')).toBe(31);
  });
});
