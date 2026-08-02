/** Returns the current month as YYYY-MM, matching the `budgets.month` column format. */
export function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

/** Formats an ISO8601 date string for display, e.g. "Jul 30, 2026". */
export function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Returns today's date as YYYY-MM-DD, the format the `expenses.date` column expects. */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
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
