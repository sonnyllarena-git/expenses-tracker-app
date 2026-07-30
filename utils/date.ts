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
