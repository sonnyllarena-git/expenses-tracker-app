import { useSettingsStore } from '@/store/useSettingsStore';
import { useWalletStore } from '@/store/useWalletStore';

/**
 * Expense and loan-payment mutations can debit/credit a wallet's balance as a
 * side effect (see db/queries/expenses.ts / db/queries/loans.ts). That write
 * happens directly in SQLite, so useWalletStore's in-memory copy would
 * otherwise go stale — refetch it after any such mutation rather than trying
 * to mirror the balance math here too.
 *
 * Lives standalone (not inside useExpenseStore) so neither store needs to
 * import the other: useSettingsStore already imports useExpenseStore for
 * resetAllData, and useExpenseStore importing useSettingsStore back (for
 * this helper) used to create a require cycle between the two.
 */
export async function refreshWallets(): Promise<void> {
  const userId = useSettingsStore.getState().account?.id;
  if (userId) {
    await useWalletStore.getState().load(userId);
  }
}
