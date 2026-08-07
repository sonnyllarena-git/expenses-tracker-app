import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput } from 'react-native';

import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useCategoryStore } from '@/store/useCategoryStore';
import { useSubcategoryStore } from '@/store/useSubcategoryStore';

interface SubcategoryPickerProps {
  categoryId: string;
  /** Selected subcategory id, or null if none picked yet. */
  value: string | null;
  onChange: (subcategoryId: string | null) => void;
}

const MAX_VISIBLE_OPTIONS = 8;

/**
 * Searchable "type to filter, tap to select" subcategory picker shown once a
 * category is chosen — used by ExpenseForm and SuggestedActionCard. Reads
 * useCategoryStore/useSubcategoryStore directly (like other form components
 * in this codebase) rather than requiring the parent to pass them down.
 */
export function SubcategoryPicker({ categoryId, value, onChange }: SubcategoryPickerProps) {
  const colorScheme = useColorScheme();
  const category = useCategoryStore((state) => state.categories.find((c) => c.id === categoryId));
  const subcategories = useSubcategoryStore((state) => state.subcategories);
  const addCustomSubcategory = useSubcategoryStore((state) => state.addCustomSubcategory);
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);

  const options = useMemo(
    () => subcategories.filter((s) => s.categoryId === categoryId),
    [subcategories, categoryId]
  );
  const selected = options.find((s) => s.id === value) ?? null;

  const trimmed = query.trim().toLowerCase();
  const filtered = trimmed ? options.filter((s) => s.name.toLowerCase().includes(trimmed)) : options;
  const hasExactMatch = options.some((s) => s.name.toLowerCase() === trimmed);

  async function handleAddCustom() {
    const name = query.trim();
    if (!name || adding) {
      return;
    }
    setAdding(true);
    try {
      const created = await addCustomSubcategory(categoryId, name);
      onChange(created.id);
      setQuery('');
    } finally {
      setAdding(false);
    }
  }

  if (selected) {
    return (
      <View style={[styles.selectedRow, { borderColor: Colors[colorScheme].border }]}>
        <Text style={styles.selectedText}>
          {category?.name ?? 'Category'} {'>'} {selected.name}
        </Text>
        <Pressable onPress={() => onChange(null)} hitSlop={8}>
          <Text style={[styles.changeText, { color: Colors[colorScheme].primary }]}>Change</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={[
          styles.input,
          { color: Colors[colorScheme].text, borderColor: Colors[colorScheme].border },
        ]}
        value={query}
        onChangeText={setQuery}
        placeholder="Search subcategory..."
        placeholderTextColor={Colors[colorScheme].tabIconDefault}
      />
      <View style={[styles.list, { borderColor: Colors[colorScheme].border }]}>
        {filtered.length === 0 && !trimmed && (
          <Text style={styles.emptyText}>No subcategories yet.</Text>
        )}
        {filtered.slice(0, MAX_VISIBLE_OPTIONS).map((option) => (
          <Pressable
            key={option.id}
            onPress={() => {
              onChange(option.id);
              setQuery('');
            }}
            style={[styles.optionRow, { borderColor: Colors[colorScheme].border }]}
          >
            <Text style={styles.optionText}>{option.name}</Text>
            {option.isCustom && (
              <Text style={[styles.customBadge, { color: Colors[colorScheme].secondary }]}>
                custom
              </Text>
            )}
          </Pressable>
        ))}
        {!!trimmed && !hasExactMatch && (
          <Pressable
            onPress={handleAddCustom}
            disabled={adding}
            style={[styles.optionRow, { borderColor: Colors[colorScheme].border }]}
          >
            <Text style={[styles.addCustomText, { color: Colors[colorScheme].primary }]}>
              {adding ? 'Adding…' : `+ Add custom "${query.trim()}"`}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  list: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  optionText: {
    fontSize: 14,
  },
  customBadge: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  addCustomText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 13,
    opacity: 0.6,
    padding: 12,
  },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  selectedText: {
    fontSize: 14,
    fontWeight: '600',
  },
  changeText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
