import type { RecurringFrequency } from '@/types';

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

/** Formats a YYYY-MM-DD date string with weekday, e.g. "Monday, August 5". */
export function formatLongDate(isoDate: string): string {
  // Parsed as local year/month/day for the same reason as formatDate above.
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
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

/** Moves a YYYY-MM month forward/backward by `delta` months, e.g. ('2026-01', -1) -> '2025-12'. */
export function shiftMonth(month: string, delta: number): string {
  const [year, monthNum] = month.split('-').map(Number);
  const shifted = new Date(year, monthNum - 1 + delta, 1);
  return `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, '0')}`;
}

/** Formats a YYYY-MM month for display, e.g. '2026-08' -> 'August 2026'. */
export function formatMonthLabel(month: string): string {
  const [year, monthNum] = month.split('-').map(Number);
  return new Date(year, monthNum - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

/** Advances a YYYY-MM-DD date by one recurrence of the given frequency. */
export function nextOccurrenceDate(date: string, frequency: RecurringFrequency): string {
  const [year, month, day] = date.split('-').map(Number);
  const next = new Date(year, month - 1, day);

  if (frequency === 'daily') {
    next.setDate(next.getDate() + 1);
  } else if (frequency === 'weekly') {
    next.setDate(next.getDate() + 7);
  } else {
    next.setMonth(next.getMonth() + 1);
  }

  const y = next.getFullYear();
  const m = String(next.getMonth() + 1).padStart(2, '0');
  const d = String(next.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Resolves a 1-31 payday setting to an actual date in the given year/month,
 * clamping to that month's last day (e.g. payday 31 in a 30-day month -> the 30th).
 */
function paydayDateInMonth(year: number, monthIndex: number, payday: number): Date {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  return new Date(year, monthIndex, Math.min(payday, lastDay));
}

/**
 * Days remaining until the next occurrence of `payday` (1-31) on/after `now`,
 * clamped to each month's actual length. Returns 0 if payday is today.
 */
export function daysUntilPayday(payday: number, now: Date = new Date()): number {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let next = paydayDateInMonth(today.getFullYear(), today.getMonth(), payday);
  if (next < today) {
    next = paydayDateInMonth(today.getFullYear(), today.getMonth() + 1, payday);
  }

  return Math.round((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/** The next occurrence of `payday` (1-31) on/after `now`, as a YYYY-MM-DD date. */
export function nextPaydayDate(payday: number, now: Date = new Date()): string {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let next = paydayDateInMonth(today.getFullYear(), today.getMonth(), payday);
  if (next < today) {
    next = paydayDateInMonth(today.getFullYear(), today.getMonth() + 1, payday);
  }

  const y = next.getFullYear();
  const m = String(next.getMonth() + 1).padStart(2, '0');
  const d = String(next.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Shifts a YYYY-MM-DD date by `deltaDays` (negative moves backward). */
export function shiftDate(date: string, deltaDays: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const shifted = new Date(year, month - 1, day + deltaDays);
  const y = shifted.getFullYear();
  const m = String(shifted.getMonth() + 1).padStart(2, '0');
  const d = String(shifted.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
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
