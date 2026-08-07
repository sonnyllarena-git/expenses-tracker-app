import { Ionicons } from '@expo/vector-icons';
import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useState, type ComponentProps } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';

import { ChipPicker } from '@/components/ChipPicker';
import { SubcategoryPicker } from '@/components/SubcategoryPicker';
import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { WALLET_TYPE_OPTIONS } from '@/constants/wallets';
import { useCategoryStore } from '@/store/useCategoryStore';
import { useWalletStore } from '@/store/useWalletStore';
import type { Expense } from '@/types';
import { isValidDateString, today } from '@/utils/date';
import { generateId } from '@/utils/uuid';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

// Sentinel for "no wallet" in the picker — kept out of the real id space so
// it can share ChipPicker's string-keyed selection state with real wallet ids.
const NO_WALLET = '__none__';

export interface ExpenseFormValues {
  amount: number;
  categoryId: string;
  /** Optional finer-grained classification within categoryId; null if not picked. */
  subcategoryId: string | null;
  date: string;
  description: string;
  receiptPhotoPath: string | null;
  /** Which wallet this was paid from; null if not tied to a wallet. */
  walletId: string | null;
}

interface ExpenseFormProps {
  /** When provided, the form is pre-filled for editing this expense. */
  initialExpense?: Expense;
  submitLabel: string;
  onSubmit: (values: ExpenseFormValues) => Promise<void>;
}

/** Add/Edit expense form, shared by the Add tab and the edit-expense screen. */
export function ExpenseForm({ initialExpense, submitLabel, onSubmit }: ExpenseFormProps) {
  const categories = useCategoryStore((state) => state.categories);
  const wallets = useWalletStore((state) => state.wallets);
  const colorScheme = useColorScheme();

  const [amountText, setAmountText] = useState(initialExpense ? String(initialExpense.amount) : '');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    initialExpense?.categoryId ?? null
  );
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(
    initialExpense?.subcategoryId ?? null
  );
  const [dateText, setDateText] = useState(initialExpense?.date ?? today());
  const [description, setDescription] = useState(initialExpense?.description ?? '');
  const [receiptPhotoPath, setReceiptPhotoPath] = useState<string | null>(
    initialExpense?.receiptPhotoPath ?? null
  );
  const [selectedWalletId, setSelectedWalletId] = useState<string>(
    initialExpense?.walletId ?? NO_WALLET
  );
  const [saving, setSaving] = useState(false);
  const [pickingPhoto, setPickingPhoto] = useState(false);

  async function handlePickReceipt() {
    setPickingPhoto(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Allow photo library access to attach a receipt.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.6,
      });
      if (result.canceled || result.assets.length === 0) {
        return;
      }

      const picked = result.assets[0];
      const extension = picked.uri.split('.').pop()?.split('?')[0] || 'jpg';
      const receiptsDir = new Directory(Paths.document, 'receipts');
      receiptsDir.create({ intermediates: true, idempotent: true });
      const destination = new File(receiptsDir, `receipt_${generateId()}.${extension}`);
      new File(picked.uri).copy(destination, { overwrite: true });
      setReceiptPhotoPath(destination.uri);
    } catch (err) {
      Alert.alert('Failed to attach receipt', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setPickingPhoto(false);
    }
  }

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

    setSaving(true);
    try {
      await onSubmit({
        amount,
        categoryId: selectedCategoryId,
        subcategoryId: selectedSubcategoryId,
        date: dateText,
        description: description.trim(),
        receiptPhotoPath,
        walletId: selectedWalletId === NO_WALLET ? null : selectedWalletId,
      });
      // Reset to a blank form after a successful add, so another expense can
      // be logged right away. Edit mode skips this — the caller navigates
      // away on success, so there's nothing useful to reset back to.
      if (!initialExpense) {
        setAmountText('');
        setSelectedCategoryId(null);
        setSelectedSubcategoryId(null);
        setDateText(today());
        setDescription('');
        setReceiptPhotoPath(null);
        setSelectedWalletId(NO_WALLET);
      }
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
              onPress={() => {
                // Subcategories belong to a category — dropped when switching
                // to a different one, kept when re-tapping the same one.
                if (category.id !== selectedCategoryId) {
                  setSelectedSubcategoryId(null);
                }
                setSelectedCategoryId(category.id);
              }}
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

      {selectedCategoryId && (
        <>
          <Text style={styles.label}>Subcategory</Text>
          <SubcategoryPicker
            categoryId={selectedCategoryId}
            value={selectedSubcategoryId}
            onChange={setSelectedSubcategoryId}
          />
        </>
      )}

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

      <Text style={styles.label}>Paid from</Text>
      <ChipPicker
        options={[
          { value: NO_WALLET, label: 'None' },
          ...wallets.map((wallet) => ({
            value: wallet.id,
            label: wallet.name,
            icon: WALLET_TYPE_OPTIONS.find((o) => o.value === wallet.type)?.icon as
              | IoniconName
              | undefined,
          })),
        ]}
        selectedValue={selectedWalletId}
        onSelect={setSelectedWalletId}
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

      <Text style={styles.label}>Receipt</Text>
      {receiptPhotoPath ? (
        <View style={styles.receiptRow}>
          <Image source={{ uri: receiptPhotoPath }} style={styles.receiptThumb} />
          <Pressable onPress={() => setReceiptPhotoPath(null)}>
            <Text style={[styles.removeReceiptText, { color: Colors[colorScheme].error }]}>
              Remove
            </Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={handlePickReceipt}
          disabled={pickingPhoto}
          style={[styles.receiptButton, { borderColor: Colors[colorScheme].border }]}
        >
          <Ionicons name="image-outline" size={18} color={Colors[colorScheme].text} />
          <Text style={styles.receiptButtonText}>
            {pickingPhoto ? 'Opening…' : 'Add Receipt Photo'}
          </Text>
        </Pressable>
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
  receiptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  receiptThumb: {
    width: 64,
    height: 64,
    borderRadius: 8,
  },
  removeReceiptText: {
    fontSize: 13,
    fontWeight: '600',
  },
  receiptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
  },
  receiptButtonText: {
    fontSize: 14,
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
