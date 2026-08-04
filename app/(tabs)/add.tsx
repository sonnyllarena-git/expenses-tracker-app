import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet } from 'react-native';

import { ChipPicker, type ChipOption } from '@/components/ChipPicker';
import { ExpenseForm, type ExpenseFormValues } from '@/components/ExpenseForm';
import { IncomeForm, type IncomeFormValues } from '@/components/IncomeForm';
import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useExpenseStore } from '@/store/useExpenseStore';
import { useIncomeStore } from '@/store/useIncomeStore';
import { useSettingsStore } from '@/store/useSettingsStore';

type EntryKind = 'expense' | 'income';

const ENTRY_KIND_OPTIONS: ChipOption<EntryKind>[] = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
];

export default function AddExpenseScreen() {
  const account = useSettingsStore((state) => state.account);
  const addExpense = useExpenseStore((state) => state.addExpense);
  const addIncome = useIncomeStore((state) => state.addIncome);
  const colorScheme = useColorScheme();
  const router = useRouter();
  const [entryKind, setEntryKind] = useState<EntryKind>('expense');

  async function handleSubmitExpense(values: ExpenseFormValues) {
    if (!account) {
      Alert.alert('Not ready', 'The app is still starting up — try again in a moment.');
      return;
    }
    await addExpense({ userId: account.id, ...values });
  }

  async function handleSubmitIncome(values: IncomeFormValues) {
    if (!account) {
      Alert.alert('Not ready', 'The app is still starting up — try again in a moment.');
      return;
    }
    await addIncome({ userId: account.id, ...values });
  }

  return (
    <View style={styles.container}>
      <View style={styles.entryKindRow}>
        <ChipPicker options={ENTRY_KIND_OPTIONS} selectedValue={entryKind} onSelect={setEntryKind} />
      </View>

      {entryKind === 'expense' ? (
        <>
          <Pressable onPress={() => router.push('/recurring')} style={styles.recurringLink}>
            <Text style={[styles.recurringLinkText, { color: Colors[colorScheme].primary }]}>
              Manage Recurring Expenses →
            </Text>
          </Pressable>
          <ExpenseForm submitLabel="Add Expense" onSubmit={handleSubmitExpense} />
        </>
      ) : (
        <IncomeForm submitLabel="Add Income" onSubmit={handleSubmitIncome} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  entryKindRow: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  recurringLink: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  recurringLinkText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
