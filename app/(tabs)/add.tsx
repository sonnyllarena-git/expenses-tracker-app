import { Ionicons } from '@expo/vector-icons';
import { useState, type ComponentProps } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';

import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useCategoryStore } from '@/store/useCategoryStore';
import { useExpenseStore } from '@/store/useExpenseStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { isValidDateString, today } from '@/utils/date';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export default function AddExpenseScreen() {
  const account = useSettingsStore((state) => state.account);
  const categories = useCategoryStore((state) => state.categories);
  const addExpense = useExpenseStore((state) => state.addExpense);
  const colorScheme = useColorScheme();

  const [amountText, setAmountText] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [dateText, setDateText] = useState(today());
  const [description, setDescription] = useState('');
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
    if (!isValidDateString(dateText)) {
      Alert.alert('Invalid date', 'Enter the date as YYYY-MM-DD.');
      return;
    }
    if (!account) {
      Alert.alert('Not ready', 'The app is still starting up — try again in a moment.');
      return;
    }

    setSaving(true);
    try {
      await addExpense({
        userId: account.id,
        amount,
        categoryId: selectedCategoryId,
        date: dateText,
        description: description.trim(),
      });
      setAmountText('');
      setDescription('');
      setDateText(today());
      setSelectedCategoryId(null);
    } catch (err) {
      Alert.alert('Failed to save expense', err instanceof Error ? err.message : 'Unknown error');
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

      <Text style={styles.label}>Category</Text>
      <View style={styles.categoryRow}>
        {categories.map((category) => {
          const selected = category.id === selectedCategoryId;
          return (
            <Pressable
              key={category.id}
              onPress={() => setSelectedCategoryId(category.id)}
              style={[
                styles.categoryChip,
                { borderColor: category.color },
                selected && { backgroundColor: category.color },
              ]}
            >
              <Ionicons
                name={category.icon as IoniconName}
                size={16}
                color={selected ? '#fff' : category.color}
              />
              <Text style={[styles.categoryChipText, selected && { color: '#fff' }]}>
                {category.name}
              </Text>
            </Pressable>
          );
        })}
      </View>

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
          { backgroundColor: Colors[colorScheme].accent },
          saving && styles.submitButtonDisabled,
        ]}
      >
        <Text style={styles.submitButtonText}>{saving ? 'Saving…' : 'Add Expense'}</Text>
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
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
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
