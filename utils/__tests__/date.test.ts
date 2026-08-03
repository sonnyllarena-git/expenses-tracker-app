import { daysInMonth, greetingForNow } from '../date';

describe('greetingForNow', () => {
  it('returns a morning greeting between 6am and noon', () => {
    expect(['Good morning! ☀️', 'Rise and shine! ☕']).toContain(
      greetingForNow(new Date(2026, 7, 3, 8, 0))
    );
  });

  it('returns an afternoon greeting between noon and 6pm', () => {
    expect(['Good afternoon! 🌤️', 'Happy coffee afternoon! ☕']).toContain(
      greetingForNow(new Date(2026, 7, 3, 14, 0))
    );
  });

  it('returns an evening greeting after 6pm', () => {
    expect(['Good evening! 🌙', 'Settle in! 🛋️']).toContain(
      greetingForNow(new Date(2026, 7, 3, 20, 0))
    );
  });

  it('returns an evening greeting before 6am', () => {
    expect(['Good evening! 🌙', 'Settle in! 🛋️']).toContain(
      greetingForNow(new Date(2026, 7, 3, 3, 0))
    );
  });

  it('overrides with a Christmas greeting on Dec 25', () => {
    expect(greetingForNow(new Date(2026, 11, 25, 10, 0))).toBe('Merry Christmas! 🎄');
  });

  it('overrides with a New Year greeting on Jan 1', () => {
    expect(greetingForNow(new Date(2026, 0, 1, 10, 0))).toBe('Happy New Year! 🎉');
  });
});

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
