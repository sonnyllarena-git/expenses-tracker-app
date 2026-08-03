import { Ionicons } from '@expo/vector-icons';
import { type ComponentProps } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export interface ChipOption<T extends string> {
  value: T;
  label: string;
  /** Border/fill color; falls back to the theme accent color. */
  color?: string;
  /** Omit for a text-only chip. */
  icon?: IoniconName;
}

interface ChipPickerProps<T extends string> {
  options: ChipOption<T>[];
  selectedValue: T | null;
  onSelect: (value: T) => void;
}

/** Wrap-row chip selector, generalized from the Add screen's category chips. */
export function ChipPicker<T extends string>({
  options,
  selectedValue,
  onSelect,
}: ChipPickerProps<T>) {
  const colorScheme = useColorScheme();

  return (
    <View style={styles.row}>
      {options.map((option) => {
        const selected = option.value === selectedValue;
        const color = option.color ?? Colors[colorScheme].accent;
        return (
          <Pressable
            key={option.value}
            onPress={() => onSelect(option.value)}
            style={[styles.chip, { borderColor: color }, selected && { backgroundColor: color }]}
          >
            {option.icon && (
              <Ionicons name={option.icon} size={16} color={selected ? '#fff' : color} />
            )}
            <Text style={[styles.chipText, selected && { color: '#fff' }]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
