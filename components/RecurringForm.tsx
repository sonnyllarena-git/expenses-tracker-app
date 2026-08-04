import { Ionicons } from '@expo/vector-icons';
import { useState, type ComponentProps } from 'react';
import { Alert, Pressable, StyleSheet, TextInput } from 'react-native';

import { ChipPicker, type ChipOption } from '@/components/ChipPicker';
import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useCategoryStore } from '@/store/useCategoryStore';
import type { Expense, RecurringFrequency } from '@/types';
import { isValidDateString, today } from '@/utils/date';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

const FREQUENCY_OPTIONS: ChipOption<RecurringFrequency>[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

export interface RecurringFormValues {
  amount: number;
  categoryId: string;
  description: string;
  frequency: RecurringFrequency;
  startDate: string;
}

interface RecurringFormProps {
  /** When provided, the form edits this template (start date becomes read-only). */
  initialTemplate?: Expense;
  submitLabel: string;
  onSubmit: (values: RecurringFormValues) => Promise<void>;
}

/** Create/Edit recurring-expense-template form, used both standalone and inline in a list. */
export function RecurringForm({ initialTemplate, submitLabel, onSubmit }: RecurringFormProps) {
  const categories = useCategoryStore((state) => state.categories);
  const colorScheme = useColorScheme();

  const [amountText, setAmountText] = useState(
    initialTemplate ? String(initialTemplate.amount) : ''
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    initialTemplate?.categoryId ?? null
  );
  const [description, setDescription] = useState(initialTemplate?.description ?? '');
  const [frequency, setFrequency] = useState<RecurringFrequency>(
    (initialTemplate?.recurringFrequency as RecurringFrequency | null) ?? 'monthly'
  );
  const [startDate, setStartDate] = useState(initialTemplate?.date ?? today());
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    const amount = Number(amountText);
    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert('Invalid amount', 'Enter an amount greater than zero.');
      return;
    }
    if (!selectedCategoryId) {
      Alert.alert('Missing category', 'Select a category.');
      return;
    }
    if (!initialTemplate && !isValidDateString(startDate)) {
      Alert.alert('Invalid date', 'Enter the start date as YYYY-MM-DD.');
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        amount,
        categoryId: selectedCategoryId,
        description: description.trim(),
        frequency,
        startDate,
      });
      if (!initialTemplate) {
        setAmountText('');
        setSelectedCategoryId(null);
        setDescription('');
        setFrequency('monthly');
        setStartDate(today());
      }
    } catch (err) {
      Alert.alert('Failed to save', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.form}>
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

      <Text style={styles.label}>Category</Text>
      <ChipPicker
        options={categories.map((c) => ({
          value: c.id,
          label: c.name,
          color: c.color,
          icon: c.icon as IoniconName,
        }))}
        selectedValue={selectedCategoryId}
        onSelect={setSelectedCategoryId}
      />

      <Text style={styles.label}>Frequency</Text>
      <ChipPicker options={FREQUENCY_OPTIONS} selectedValue={frequency} onSelect={setFrequency} />

      {!initialTemplate && (
        <>
          <Text style={styles.label}>Start Date</Text>
          <TextInput
            style={[
              styles.input,
              { color: Colors[colorScheme].text, borderColor: Colors[colorScheme].border },
            ]}
            value={startDate}
            onChangeText={setStartDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={Colors[colorScheme].tabIconDefault}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </>
      )}

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[
          styles.input,
          { color: Colors[colorScheme].text, borderColor: Colors[colorScheme].border },
        ]}
        value={description}
        onChangeText={setDescription}
        placeholder="Optional"
        placeholderTextColor={Colors[colorScheme].tabIconDefault}
      />

      <Pressable
        onPress={handleSubmit}
        disabled={saving}
        style={[
          styles.submitButton,
          { backgroundColor: Colors[colorScheme].primary },
          saving && styles.disabled,
        ]}
      >
        <Text style={styles.submitButtonText}>{saving ? 'Saving…' : submitLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    opacity: 0.7,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  submitButton: {
    marginTop: 16,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.6,
  },
});
