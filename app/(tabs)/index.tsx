import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState, type ComponentProps } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';

import { AvatarMood } from '@/components/AvatarMood';
import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useBudgetStore } from '@/store/useBudgetStore';
import { useCategoryStore } from '@/store/useCategoryStore';
import { useExpenseStore } from '@/store/useExpenseStore';
import { useIncomeStore } from '@/store/useIncomeStore';
import { useRecurringStore } from '@/store/useRecurringStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useWalletStore } from '@/store/useWalletStore';
import { moodFromUsage, overallBudgetUsage } from '@/utils/budget';
import { formatCurrency } from '@/utils/currency';
import {
  last7DaysSpend,
  monthIncomeVsExpenses,
  upcomingRecurringExpenses,
} from '@/utils/dashboard';
import { currentMonth, daysUntilPayday, formatDate, greetingForNow, today } from '@/utils/date';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

const UPCOMING_WINDOW_DAYS = 30;

export default function DashboardScreen() {
  // Account, categories, and expenses are all guaranteed loaded before this
  // screen can render — see db/DatabaseProvider.tsx's BootstrapGate.
  const { account } = useSettingsStore();
  const { categories } = useCategoryStore();
  const { expenses } = useExpenseStore();
  const { income } = useIncomeStore();
  const templates = useRecurringStore((state) => state.templates);
  const budgets = useBudgetStore((state) => state.budgets);
  const loadBudgets = useBudgetStore((state) => state.load);
  const netWorth = useWalletStore((state) => state.netWorth());
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
  const usage = overallBudgetUsage(budgets, expenses, month);
  const mood = moodFromUsage(usage);
  const currency = account?.currency ?? 'PHP';

  const barData = last7DaysSpend(expenses, today()).map((bar) => ({
    value: bar.value,
    label: bar.label,
    frontColor: Colors[colorScheme].primary,
  }));

  const upcoming = upcomingRecurringExpenses(
    templates,
    expenses,
    categories,
    today(),
    UPCOMING_WINDOW_DAYS
  );

  const { totalIncome, totalExpenses, net } = monthIncomeVsExpenses(income, expenses, month);
  const paydayDays = account ? daysUntilPayday(account.payday) : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Dashboard</Text>

      <View style={styles.moodSection}>
        <AvatarMood mood={mood} />
        <Text style={styles.greeting}>{greeting}</Text>
      </View>

      <View style={[styles.card, { backgroundColor: Colors[colorScheme].card }]}>
        <Text style={styles.sectionTitle}>Last 7 Days</Text>
        <View style={styles.chartRow}>
          <BarChart
            data={barData}
            barWidth={22}
            spacing={16}
            noOfSections={4}
            height={140}
            isAnimated
            xAxisLabelTextStyle={{ color: Colors[colorScheme].text, fontSize: 11 }}
            yAxisTextStyle={{ color: Colors[colorScheme].text }}
          />
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: Colors[colorScheme].card }]}>
        <Text style={styles.sectionTitle}>Payday</Text>
        {account && paydayDays !== null ? (
          <Text style={styles.paydayText}>
            {paydayDays === 0
              ? 'Payday is today! 🎉'
              : `${paydayDays} day${paydayDays === 1 ? '' : 's'} until payday (Day ${account.payday})`}
          </Text>
        ) : (
          <Text style={styles.emptyText}>Loading…</Text>
        )}
      </View>

      <View style={[styles.card, { backgroundColor: Colors[colorScheme].card }]}>
        <Text style={styles.sectionTitle}>Upcoming</Text>
        {upcoming.length === 0 ? (
          <Text style={styles.emptyText}>No recurring expenses due in the next 30 days.</Text>
        ) : (
          upcoming.map((item) => (
            <View key={item.templateId} style={styles.upcomingRow}>
              <View style={[styles.iconCircle, { backgroundColor: item.categoryColor }]}>
                <Ionicons name={item.categoryIcon as IoniconName} size={16} color="#fff" />
              </View>
              <View style={styles.upcomingMain}>
                <Text style={styles.upcomingTitle}>{item.categoryName}</Text>
                <Text style={styles.upcomingCaption}>
                  {formatDate(item.dueDate)} ·{' '}
                  {item.daysLeft === 0 ? 'Due today' : `${item.daysLeft} days left`}
                </Text>
              </View>
              <Text style={styles.upcomingAmount}>{formatCurrency(item.amount, currency)}</Text>
            </View>
          ))
        )}
      </View>

      <View style={[styles.netWorthCard, { backgroundColor: Colors[colorScheme].primary }]}>
        <Text style={styles.netWorthLabel}>Net Worth</Text>
        <Text style={styles.netWorthValue}>{formatCurrency(netWorth, currency)}</Text>
      </View>

      <View style={[styles.card, { backgroundColor: Colors[colorScheme].card }]}>
        <Text style={styles.sectionTitle}>This Month</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Income</Text>
          <Text style={[styles.summaryValue, { color: Colors[colorScheme].success }]}>
            {formatCurrency(totalIncome, currency)}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Expenses</Text>
          <Text style={[styles.summaryValue, { color: Colors[colorScheme].error }]}>
            {formatCurrency(totalExpenses, currency)}
          </Text>
        </View>
        <View
          style={[styles.summaryRow, styles.netRow, { borderTopColor: Colors[colorScheme].border }]}
        >
          <Text style={styles.summaryLabelBold}>Net</Text>
          <Text
            style={[
              styles.summaryValueBold,
              { color: net >= 0 ? Colors[colorScheme].success : Colors[colorScheme].error },
            ]}
          >
            {formatCurrency(net, currency)}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  moodSection: {
    alignItems: 'center',
    gap: 8,
  },
  greeting: {
    fontSize: 16,
    fontWeight: '600',
  },
  netWorthCard: {
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    gap: 4,
  },
  netWorthLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    opacity: 0.85,
  },
  netWorthValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
  },
  card: {
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  emptyText: {
    opacity: 0.7,
  },
  chartRow: {
    alignItems: 'center',
    marginTop: 8,
  },
  paydayText: {
    fontSize: 16,
    fontWeight: '600',
  },
  upcomingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upcomingMain: {
    flex: 1,
  },
  upcomingTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  upcomingCaption: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 2,
  },
  upcomingAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    opacity: 0.7,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  netRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
    paddingTop: 8,
  },
  summaryLabelBold: {
    fontSize: 14,
    fontWeight: '700',
  },
  summaryValueBold: {
    fontSize: 16,
    fontWeight: '800',
  },
});
