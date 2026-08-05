import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { ChipPicker, type ChipOption } from '@/components/ChipPicker';
import { LoansSection } from '@/components/LoansSection';
import { RecurringSection } from '@/components/RecurringSection';

type RecurringLoansFilter = 'all' | 'recurring' | 'loans';

const FILTER_OPTIONS: ChipOption<RecurringLoansFilter>[] = [
  { value: 'all', label: 'All' },
  { value: 'recurring', label: 'Recurring' },
  { value: 'loans', label: 'Loans' },
];

/**
 * "Recurring & Loans" sub-tab of the Expenses screen — combines recurring
 * expense management and loan tracking in one scrollable screen, with a
 * filter row to show just one section at a time.
 */
export function RecurringAndLoansSection() {
  const [filter, setFilter] = useState<RecurringLoansFilter>('all');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ChipPicker options={FILTER_OPTIONS} selectedValue={filter} onSelect={setFilter} />
      {filter !== 'loans' && <RecurringSection />}
      {filter !== 'recurring' && <LoansSection />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
});
