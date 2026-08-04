import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';

import { ChipPicker, type ChipOption } from '@/components/ChipPicker';
import { SettingsToggleRow } from '@/components/SettingsToggleRow';
import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import type { Income, RecurringFrequency } from '@/types';
import { isValidDateString, today } from '@/utils/date';

const FREQUENCY_OPTIONS: ChipOption<RecurringFrequency>[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

export interface IncomeFormValues {
  amount: number;
  source: string;
  date: string;
  isRecurring: boolean;
  recurringFrequency: RecurringFrequency | null;
}

interface IncomeFormProps {
  /** When provided, the form is pre-filled for editing this income entry. */
  initialIncome?: Income;
  submitLabel: string;
  onSubmit: (values: IncomeFormValues) => Promise<void>;
}

/** Add/Edit income form, mirroring ExpenseForm's layout and conventions. */
export function IncomeForm({ initialIncome, submitLabel, onSubmit }: IncomeFormProps) {
  const colorScheme = useColorScheme();

  const [amountText, setAmountText] = useState(initialIncome ? String(initialIncome.amount) : '');
  const [source, setSource] = useState(initialIncome?.source ?? '');
  const [dateText, setDateText] = useState(initialIncome?.date ?? today());
  const [isRecurring, setIsRecurring] = useState(initialIncome?.isRecurring ?? false);
  const [frequency, setFrequency] = useState<RecurringFrequency>(
    initialIncome?.recurringFrequency ?? 'monthly'
  );
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    const amount = Number(amountText);
    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert('Invalid amount', 'Enter an amount greater than zero.');
      return;
    }
    if (!isValidDateString(dateText)) {
      Alert.alert('Invalid date', 'Enter the date as YYYY-MM-DD.');
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        amount,
        source: source.trim(),
        date: dateText,
        isRecurring,
        recurringFrequency: isRecurring ? frequency : null,
      });
      // Mirrors ExpenseForm: reset to a blank form after a successful add so
      // another entry can be logged right away; edit mode navigates away instead.
      if (!initialIncome) {
        setAmountText('');
        setSource('');
        setDateText(today());
        setIsRecurring(false);
        setFrequency('monthly');
      }
    } catch (err) {
      Alert.alert('Failed to save income', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.label}>Amount</Text>
      <TextInput
        style={[
          styles.input,
          { color: Colors[colorScheme].text, borderColor: Colors[colorScheme].border },
        ]}
        value={amountText}
        onChangeText={setAmountText}
        placeholder="0.00"
        placeholderTextColor={Colors[colorScheme].tabIconDefault}
        keyboardType="decimal-pad"
      />

      <Text style={styles.label}>Source</Text>
      <TextInput
        style={[
          styles.input,
          { color: Colors[colorScheme].text, borderColor: Colors[colorScheme].border },
        ]}
        value={source}
        onChangeText={setSource}
        placeholder="e.g. Salary, Freelance"
        placeholderTextColor={Colors[colorScheme].tabIconDefault}
      />

      <Text style={styles.label}>Date</Text>
      <TextInput
        style={[
          styles.input,
          { color: Colors[colorScheme].text, borderColor: Colors[colorScheme].border },
        ]}
        value={dateText}
        onChangeText={setDateText}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={Colors[colorScheme].tabIconDefault}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <SettingsToggleRow label="Recurring" value={isRecurring} onValueChange={setIsRecurring} />

      {isRecurring && (
        <>
          <Text style={styles.label}>Frequency</Text>
          <ChipPicker
            options={FREQUENCY_OPTIONS}
            selectedValue={frequency}
            onSelect={setFrequency}
          />
        </>
      )}

      <Pressable
        onPress={handleSubmit}
        disabled={saving}
        style={[
          styles.submitButton,
          { backgroundColor: Colors[colorScheme].primary },
          saving && styles.submitButtonDisabled,
        ]}
      >
        <Text style={styles.submitButtonText}>{saving ? 'Saving…' : submitLabel}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    gap: 8,
  },
  label: {
    fontSize: 13,
    opacity: 0.7,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  submitButton: {
    marginTop: 24,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
