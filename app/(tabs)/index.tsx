import { StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useCategoryStore } from '@/store/useCategoryStore';
import { useExpenseStore } from '@/store/useExpenseStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { formatCurrency } from '@/utils/currency';
import { currentMonth } from '@/utils/date';

export default function DashboardScreen() {
  // Account, categories, and expenses are all guaranteed loaded before this
  // screen can render — see db/DatabaseProvider.tsx's BootstrapGate.
  const { account } = useSettingsStore();
  const { categories } = useCategoryStore();
  const { expenses } = useExpenseStore();
  const colorScheme = useColorScheme();

  const monthTotal = expenses
    .filter((expense) => expense.date.startsWith(currentMonth()))
    .reduce((sum, expense) => sum + expense.amount, 0);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dashboard</Text>
      <Text style={styles.subtitle}>Monthly summary, charts, and recent expenses land here.</Text>

      <View style={[styles.statusCard, { backgroundColor: Colors[colorScheme].card }]}>
        {account && (
          <>
            <Text style={styles.statusLabel}>Account</Text>
            <Text style={styles.statusValue}>
              {account.accountType} · {account.currency}
            </Text>
          </>
        )}
        <Text style={styles.statusLabel}>Categories</Text>
        <Text style={styles.statusValue}>{categories.length}</Text>
        <Text style={styles.statusLabel}>This month so far</Text>
        <Text style={styles.statusValue}>
          {formatCurrency(monthTotal, account?.currency ?? 'PHP')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.7,
  },
  statusCard: {
    width: '100%',
    borderRadius: 12,
    padding: 16,
    gap: 4,
  },
  statusLabel: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 8,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '600',
  },
});
