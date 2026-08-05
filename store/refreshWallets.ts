import { useWalletStore } from '@/store/useWalletStore';

/**
 * Expense and loan-payment mutations can debit/credit a wallet's balance as a
 * side effect (see db/queries/expenses.ts / db/queries/loans.ts). That write
 * happens directly in SQLite, so useWalletStore's in-memory copy would
 * otherwise go stale — refetch it after any such mutation rather than trying
 * to mirror the balance math here too.
 *
 * Takes `userId` as a parameter (callers already have it from the row they
 * just mutated) rather than reading it from useSettingsStore — depending on
 * useSettingsStore here would recreate the exact require cycle this file was
 * extracted to avoid, since useSettingsStore imports useExpenseStore back for
 * resetAllData. This file only ever depends on useWalletStore.
 */
export async function refreshWallets(userId: string): Promise<void> {
  await useWalletStore.getState().load(userId);
}
