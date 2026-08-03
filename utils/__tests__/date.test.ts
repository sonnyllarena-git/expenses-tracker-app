import {
  daysInMonth,
  formatMonthLabel,
  greetingForNow,
  nextOccurrenceDate,
  shiftMonth,
} from '../date';

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

describe('shiftMonth', () => {
  it('moves forward within a year', () => {
    expect(shiftMonth('2026-08', 1)).toBe('2026-09');
  });

  it('moves backward within a year', () => {
    expect(shiftMonth('2026-08', -1)).toBe('2026-07');
  });

  it('rolls over to the next year', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
  });

  it('rolls back to the previous year', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
  });

  it('supports multi-month jumps', () => {
    expect(shiftMonth('2026-01', 13)).toBe('2027-02');
  });
});

describe('formatMonthLabel', () => {
  it('formats a YYYY-MM month as a full month name and year', () => {
    expect(formatMonthLabel('2026-08')).toBe('August 2026');
  });

  it('formats January correctly', () => {
    expect(formatMonthLabel('2026-01')).toBe('January 2026');
  });
});

describe('nextOccurrenceDate', () => {
  it('advances one day for daily', () => {
    expect(nextOccurrenceDate('2026-08-03', 'daily')).toBe('2026-08-04');
  });

  it('advances seven days for weekly', () => {
    expect(nextOccurrenceDate('2026-08-03', 'weekly')).toBe('2026-08-10');
  });

  it('advances one calendar month for monthly', () => {
    expect(nextOccurrenceDate('2026-08-03', 'monthly')).toBe('2026-09-03');
  });

  it('rolls over to the next year', () => {
    expect(nextOccurrenceDate('2026-12-25', 'weekly')).toBe('2027-01-01');
  });

  it('rolls monthly over year end', () => {
    expect(nextOccurrenceDate('2026-12-15', 'monthly')).toBe('2027-01-15');
  });
});
