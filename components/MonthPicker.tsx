import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { formatMonthLabel, shiftMonth } from '@/utils/date';

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

interface MonthPickerProps {
  month: string;
  onChange: (month: string) => void;
}

/** "< August 2026 >" with the label opening a year+month grid to jump anywhere. */
export function MonthPicker({ month, onChange }: MonthPickerProps) {
  const colorScheme = useColorScheme();
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => Number(month.slice(0, 4)));

  function openPicker() {
    setPickerYear(Number(month.slice(0, 4)));
    setPickerVisible(true);
  }

  function selectMonth(monthIndex: number) {
    onChange(`${pickerYear}-${String(monthIndex + 1).padStart(2, '0')}`);
    setPickerVisible(false);
  }

  return (
    <View style={styles.row}>
      <Pressable onPress={() => onChange(shiftMonth(month, -1))} hitSlop={8}>
        <Ionicons name="chevron-back" size={22} color={Colors[colorScheme].text} />
      </Pressable>
      <Pressable onPress={openPicker}>
        <Text style={styles.label}>{formatMonthLabel(month)}</Text>
      </Pressable>
      <Pressable onPress={() => onChange(shiftMonth(month, 1))} hitSlop={8}>
        <Ionicons name="chevron-forward" size={22} color={Colors[colorScheme].text} />
      </Pressable>

      <Modal visible={pickerVisible} transparent animationType="fade">
        <Pressable style={styles.backdrop} onPress={() => setPickerVisible(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: Colors[colorScheme].background }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.yearRow}>
              <Pressable onPress={() => setPickerYear((y) => y - 1)} hitSlop={8}>
                <Ionicons name="chevron-back" size={22} color={Colors[colorScheme].text} />
              </Pressable>
              <Text style={styles.yearLabel}>{pickerYear}</Text>
              <Pressable onPress={() => setPickerYear((y) => y + 1)} hitSlop={8}>
                <Ionicons name="chevron-forward" size={22} color={Colors[colorScheme].text} />
              </Pressable>
            </View>
            <View style={styles.monthGrid}>
              {MONTH_NAMES.map((name, index) => {
                const isSelected =
                  pickerYear === Number(month.slice(0, 4)) &&
                  index === Number(month.slice(5, 7)) - 1;
                return (
                  <Pressable
                    key={name}
                    onPress={() => selectMonth(index)}
                    style={[
                      styles.monthCell,
                      { borderColor: Colors[colorScheme].border },
                      isSelected && { backgroundColor: Colors[colorScheme].accent },
                    ]}
                  >
                    <Text style={[styles.monthCellText, isSelected && { color: '#fff' }]}>
                      {name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheet: {
    width: '85%',
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  yearLabel: {
    fontSize: 17,
    fontWeight: '700',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  monthCell: {
    width: '28%',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  monthCellText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
