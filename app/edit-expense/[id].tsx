import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';

import { ExpenseForm, type ExpenseFormValues } from '@/components/ExpenseForm';
import { Text, View } from '@/components/Themed';
import { useExpenseStore } from '@/store/useExpenseStore';

export default function EditExpenseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const expenses = useExpenseStore((state) => state.expenses);
  const editExpense = useExpenseStore((state) => state.editExpense);
  const expense = expenses.find((e) => e.id === id);

  async function handleSubmit(values: ExpenseFormValues) {
    if (!expense) {
      return;
    }
    await editExpense(expense.id, values);
    router.back();
  }

  if (!expense) {
    return (
      <View style={styles.notFound}>
        <Stack.Screen options={{ title: 'Edit Expense' }} />
        <Text style={styles.notFoundText}>Expense not found.</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Edit Expense' }} />
      <ExpenseForm initialExpense={expense} submitLabel="Save Changes" onSubmit={handleSubmit} />
    </>
  );
}

const styles = StyleSheet.create({
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  notFoundText: {
    opacity: 0.7,
  },
});
