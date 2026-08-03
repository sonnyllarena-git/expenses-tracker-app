import type { Category, Expense } from '@/types';

const CSV_HEADER = 'Date,Category,Description,Amount,Tags';

/** Wraps a field in quotes and doubles any internal quote, per RFC 4180. */
function escapeCsvField(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

/**
 * Builds a CSV string of the given expenses, one row per expense in input
 * order. Pure/string-only — no filesystem or sharing I/O here.
 */
export function expensesToCsv(expenses: Expense[], categories: Category[]): string {
  const rows = expenses.map((expense) => {
    const category = categories.find((c) => c.id === expense.categoryId);
    return [
      escapeCsvField(expense.date),
      escapeCsvField(category?.name ?? 'Uncategorized'),
      escapeCsvField(expense.description),
      expense.amount.toFixed(2),
      escapeCsvField(expense.tags.join(';')),
    ].join(',');
  });

  return [CSV_HEADER, ...rows].join('\r\n');
}
