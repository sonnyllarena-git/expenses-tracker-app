import { Alert } from 'react-native';

import { ExpenseForm, type ExpenseFormValues } from '@/components/ExpenseForm';
import { useExpenseStore } from '@/store/useExpenseStore';
import { useSettingsStore } from '@/store/useSettingsStore';

export default function AddExpenseScreen() {
  const account = useSettingsStore((state) => state.account);
  const addExpense = useExpenseStore((state) => state.addExpense);

  async function handleSubmit(values: ExpenseFormValues) {
    if (!account) {
      Alert.alert('Not ready', 'The app is still starting up — try again in a moment.');
      return;
    }
    await addExpense({ userId: account.id, ...values });
  }

  return <ExpenseForm submitLabel="Add Expense" onSubmit={handleSubmit} />;
}
