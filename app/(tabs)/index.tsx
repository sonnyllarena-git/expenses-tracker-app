import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState, type ComponentProps } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
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
import {
  currentMonth,
  daysUntilPayday,
  formatDate,
  formatLongDate,
  greetingForNow,
  today,
} from '@/utils/date';
import { formatYAxisLabel } from '@/utils/chartFormat';
import { pickDashboardInsight } from '@/utils/insight';

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
  const router = useRouter();

  // Picked once per screen mount, not on every render, so it doesn't reroll
  // between the morning/afternoon/evening variants on each re-render.
  const [greeting] = useState(() => greetingForNow());

  useEffect(() => {
    if (account) {
      loadBudgets(account.id);
    }
  }, [account, loadBudgets]);

  const month = currentMonth();
  const todayIso = today();
  const usage = overallBudgetUsage(budgets, expenses, month);
  const mood = moodFromUsage(usage);
  const currency = account?.currency ?? 'PHP';

  const bars = last7DaysSpend(expenses, todayIso);
  const barData = bars.map((bar) => ({
    value: bar.value,
    label: bar.label.charAt(0),
    frontColor: Colors[colorScheme].primary,
  }));
  const todaySpend = bars[bars.length - 1]?.value ?? 0;

  const upcoming = upcomingRecurringExpenses(
    templates,
    expenses,
    categories,
    todayIso,
    UPCOMING_WINDOW_DAYS
  );

  const { net } = monthIncomeVsExpenses(income, expenses, month);
  const paydayDays = account ? daysUntilPayday(account.payday) : null;

  const insightMessage = pickDashboardInsight({
    expenses,
    categories,
    budgets,
    monthNet: net,
    month,
    today: todayIso,
    daysUntilPayday: paydayDays,
    currency,
  });

  function openRecurringAndLoans() {
    router.push({ pathname: '/expenses', params: { tab: 'recurring' } });
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.dateText}>{formatLongDate(todayIso)}</Text>
      <Text style={styles.greeting}>{greeting}</Text>

      <View style={styles.mascotRow}>
        <AvatarMood mood={mood} size={56} />
        <View style={[styles.speechBubble, { backgroundColor: Colors[colorScheme].card }]}>
          <View style={[styles.speechBubbleTail, { borderRightColor: Colors[colorScheme].card }]} />
          <Text style={styles.speechBubbleText}>{insightMessage}</Text>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: Colors[colorScheme].card }]}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.sectionTitle}>Last 7 Days</Text>
          <Text style={styles.todaySpendText}>Today: {formatCurrency(todaySpend, currency)}</Text>
        </View>
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
            yAxisLabelWidth={52}
            formatYLabel={formatYAxisLabel}
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

      <Pressable
        onPress={openRecurringAndLoans}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: Colors[colorScheme].card },
          pressed && styles.cardPressed,
        ]}
      >
        <View style={styles.cardHeaderRow}>
          <Text style={styles.sectionTitle}>Upcoming Bills</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors[colorScheme].textSecondary} />
        </View>
        {upcoming.length === 0 ? (
          <Text style={styles.emptyText}>No bills due in the next 30 days.</Text>
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
      </Pressable>

      <Pressable
        onPress={() => router.push({ pathname: '/wallet' })}
        style={({ pressed }) => [
          styles.netWorthCard,
          { backgroundColor: Colors[colorScheme].primary },
          pressed && styles.cardPressed,
        ]}
      >
        <Text style={styles.netWorthLabel}>Net Worth</Text>
        <Text style={styles.netWorthValue}>{formatCurrency(netWorth, currency)}</Text>
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
    gap: 16,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.6,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 2,
  },
  mascotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  speechBubble: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
  },
  speechBubbleTail: {
    position: 'absolute',
    left: -6,
    top: 18,
    width: 0,
    height: 0,
    borderTopWidth: 6,
    borderBottomWidth: 6,
    borderRightWidth: 8,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  speechBubbleText: {
    fontSize: 14,
    lineHeight: 19,
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
  cardPressed: {
    opacity: 0.85,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  todaySpendText: {
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.7,
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
});
