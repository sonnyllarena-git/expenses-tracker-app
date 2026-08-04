import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet } from 'react-native';

import { ExpenseForm, type ExpenseFormValues } from '@/components/ExpenseForm';
import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useExpenseStore } from '@/store/useExpenseStore';

export default function EditExpenseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const expenses = useExpenseStore((state) => state.expenses);
  const editExpense = useExpenseStore((state) => state.editExpense);
  const removeExpense = useExpenseStore((state) => state.removeExpense);
  const expense = expenses.find((e) => e.id === id);

  async function handleSubmit(values: ExpenseFormValues) {
    if (!expense) {
      return;
    }
    await editExpense(expense.id, values);
    router.back();
  }

  function confirmDelete() {
    if (!expense) {
      return;
    }
    Alert.alert(
      'Delete expense?',
      expense.description
        ? `"${expense.description}" will be permanently deleted.`
        : 'This expense will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeExpense(expense.id);
              router.back();
            } catch (err) {
              Alert.alert('Failed to delete', err instanceof Error ? err.message : 'Unknown error');
            }
          },
        },
      ]
    );
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
      <Pressable
        onPress={confirmDelete}
        style={[styles.deleteButton, { borderColor: Colors[colorScheme].error }]}
      >
        <Text style={[styles.deleteButtonText, { color: Colors[colorScheme].error }]}>
          Delete expense
        </Text>
      </Pressable>
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
  deleteButton: {
    marginHorizontal: 24,
    marginBottom: 24,
    borderWidth: 1.5,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
