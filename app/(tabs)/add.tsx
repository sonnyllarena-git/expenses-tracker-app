import { useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet } from 'react-native';

import { ExpenseForm, type ExpenseFormValues } from '@/components/ExpenseForm';
import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useExpenseStore } from '@/store/useExpenseStore';
import { useSettingsStore } from '@/store/useSettingsStore';

export default function AddExpenseScreen() {
  const account = useSettingsStore((state) => state.account);
  const addExpense = useExpenseStore((state) => state.addExpense);
  const colorScheme = useColorScheme();
  const router = useRouter();

  async function handleSubmit(values: ExpenseFormValues) {
    if (!account) {
      Alert.alert('Not ready', 'The app is still starting up — try again in a moment.');
      return;
    }
    await addExpense({ userId: account.id, ...values });
  }

  return (
    <View style={styles.container}>
      <Pressable onPress={() => router.push('/recurring')} style={styles.recurringLink}>
        <Text style={[styles.recurringLinkText, { color: Colors[colorScheme].accent }]}>
          Manage Recurring Expenses →
        </Text>
      </Pressable>
      <ExpenseForm submitLabel="Add Expense" onSubmit={handleSubmit} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  recurringLink: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  recurringLinkText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
