import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import { AvatarMood } from '@/components/AvatarMood';
import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useBudgetStore } from '@/store/useBudgetStore';
import { useCategoryStore } from '@/store/useCategoryStore';
import { useExpenseStore } from '@/store/useExpenseStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { moodFromUsage, overallBudgetUsage } from '@/utils/budget';
import { formatCurrency } from '@/utils/currency';
import { currentMonth, greetingForNow } from '@/utils/date';

export default function DashboardScreen() {
  // Account, categories, and expenses are all guaranteed loaded before this
  // screen can render — see db/DatabaseProvider.tsx's BootstrapGate.
  const { account } = useSettingsStore();
  const { categories } = useCategoryStore();
  const { expenses } = useExpenseStore();
  const budgets = useBudgetStore((state) => state.budgets);
  const loadBudgets = useBudgetStore((state) => state.load);
  const colorScheme = useColorScheme();

  // Picked once per screen mount, not on every render, so it doesn't reroll
  // between the morning/afternoon/evening variants on each re-render.
  const [greeting] = useState(() => greetingForNow());

  useEffect(() => {
    if (account) {
      loadBudgets(account.id);
    }
  }, [account, loadBudgets]);

  const month = currentMonth();
  const monthExpenses = expenses.filter((expense) => expense.date.startsWith(month));
  const monthTotal = monthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const allTimeTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const usage = overallBudgetUsage(budgets, expenses, month);
  const mood = moodFromUsage(usage);
  const currency = account?.currency ?? 'PHP';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dashboard</Text>

      <AvatarMood mood={mood} />
      <Text style={styles.greeting}>{greeting}</Text>

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
        <Text style={styles.statusLabel}>Total this month</Text>
        <Text style={styles.statusValue}>{formatCurrency(monthTotal, currency)}</Text>
        <Text style={styles.statusLabel}>Total spent (all time)</Text>
        <Text style={styles.statusValue}>{formatCurrency(allTimeTotal, currency)}</Text>
        {usage !== null && (
          <>
            <Text style={styles.statusLabel}>Budget used this month</Text>
            <Text style={styles.statusValue}>{Math.round(usage * 100)}%</Text>
          </>
        )}
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
  greeting: {
    fontSize: 16,
    fontWeight: '600',
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
