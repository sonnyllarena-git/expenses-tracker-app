/** Returns the current month as YYYY-MM, matching the `budgets.month` column format. */
export function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

/** Formats a YYYY-MM-DD date string for display, e.g. "Jul 30, 2026". */
export function formatDate(isoDate: string): string {
  // Parsed as local year/month/day, not new Date(isoDate) — that reads a
  // date-only string as UTC midnight, which renders as the previous day in
  // any timezone behind UTC (e.g. "2026-08-03" showing as "Aug 2").
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Returns today's date as YYYY-MM-DD, the format the `expenses.date` column expects. */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const MORNING_GREETINGS = ['Good morning! ☀️', 'Rise and shine! ☕'];
const AFTERNOON_GREETINGS = ['Good afternoon! 🌤️', 'Happy coffee afternoon! ☕'];
const EVENING_GREETINGS = ['Good evening! 🌙', 'Settle in! 🛋️'];

/**
 * Time-of-day greeting, picked randomly from that period's variants.
 * Seasonal greetings (Christmas, New Year) take priority when they apply.
 */
export function greetingForNow(now: Date = new Date()): string {
  const month = now.getMonth() + 1;
  const day = now.getDate();

  if (month === 12 && day >= 24 && day <= 26) {
    return 'Merry Christmas! 🎄';
  }
  if (month === 1 && day === 1) {
    return 'Happy New Year! 🎉';
  }

  const hour = now.getHours();
  const pool =
    hour >= 6 && hour < 12
      ? MORNING_GREETINGS
      : hour >= 12 && hour < 18
        ? AFTERNOON_GREETINGS
        : EVENING_GREETINGS;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Number of days in a YYYY-MM month, e.g. '2026-02' -> 28. */
export function daysInMonth(month: string): number {
  const [year, monthNum] = month.split('-').map(Number);
  return new Date(year, monthNum, 0).getDate();
}

/** True if `value` is a real calendar date in YYYY-MM-DD form (rejects e.g. 2026-02-30). */
export function isValidDateString(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day);

  return (
    parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day
  );
}
