import { Ionicons } from '@expo/vector-icons';
import { File, Paths } from 'expo-file-system';
import { isAvailableAsync, shareAsync } from 'expo-sharing';
import { useEffect, useState, type ComponentProps } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { BarChart, LineChart, PieChart } from 'react-native-gifted-charts';

import { ChipPicker, type ChipOption } from '@/components/ChipPicker';
import { MonthPicker } from '@/components/MonthPicker';
import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useBudgetStore } from '@/store/useBudgetStore';
import { useCategoryStore } from '@/store/useCategoryStore';
import { useExpenseStore } from '@/store/useExpenseStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useWalletStore } from '@/store/useWalletStore';
import { theme } from '@/theme';
import type { Budget } from '@/types';
import { expensesToCsv } from '@/utils/csvExport';
import { formatCurrency } from '@/utils/currency';
import { currentMonth, today } from '@/utils/date';
import {
  budgetVsActual,
  groupExpensesByCategory,
  groupExpensesByDay,
  groupExpensesByWallet,
  groupExpensesByWeek,
  topWalletByWeek,
} from '@/utils/reports';

type IoniconName = ComponentProps<typeof Ionicons>['name'];
type ReportView = 'daily' | 'weekly' | 'monthly';

const REPORT_VIEW_OPTIONS: ChipOption<ReportView>[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

interface BudgetFormState {
  editingId: string | null;
  categoryId: string | null;
  limitAmountText: string;
  alertThreshold: string;
}

const initialBudgetForm: BudgetFormState = {
  editingId: null,
  categoryId: null,
  limitAmountText: '',
  alertThreshold: '0.8',
};

const ALERT_THRESHOLD_OPTIONS: ChipOption<string>[] = [
  { value: '0.5', label: '50%' },
  { value: '0.8', label: '80%' },
  { value: '0.9', label: '90%' },
  { value: '1', label: '100%' },
];

export default function ReportsScreen() {
  const account = useSettingsStore((state) => state.account);
  const categories = useCategoryStore((state) => state.categories);
  const expenses = useExpenseStore((state) => state.expenses);
  const wallets = useWalletStore((state) => state.wallets);
  const budgets = useBudgetStore((state) => state.budgets);
  const loadBudgets = useBudgetStore((state) => state.load);
  const addBudget = useBudgetStore((state) => state.addBudget);
  const editBudget = useBudgetStore((state) => state.editBudget);
  const removeBudget = useBudgetStore((state) => state.removeBudget);
  const colorScheme = useColorScheme();

  const [selectedMonth, setSelectedMonth] = useState(() => currentMonth());
  const [reportView, setReportView] = useState<ReportView>('monthly');
  const [budgetForm, setBudgetForm] = useState<BudgetFormState>(initialBudgetForm);
  const [savingBudget, setSavingBudget] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (account) {
      loadBudgets(account.id);
    }
  }, [account, loadBudgets]);

  const month = selectedMonth;
  const currency = account?.currency ?? 'PHP';

  const categorySlices = groupExpensesByCategory(expenses, categories, month);
  const monthTotal = categorySlices.reduce((sum, slice) => sum + slice.value, 0);
  const pieData = categorySlices.map((slice) => ({ value: slice.value, color: slice.color }));

  const dailyPoints = groupExpensesByDay(expenses, month);
  const weeklyPoints = groupExpensesByWeek(expenses, month);
  const lineData = dailyPoints.map((point) => ({ value: point.value, label: point.label }));
  const dailyBarData = dailyPoints.map((point) => ({
    value: point.value,
    label: point.label,
    frontColor: Colors[colorScheme].primary,
  }));
  const weeklyBarData = weeklyPoints.map((point) => ({
    value: point.value,
    label: point.label,
    frontColor: Colors[colorScheme].primary,
  }));
  const hasTrendData = dailyPoints.some((point) => point.value > 0);

  const walletSlices = groupExpensesByWallet(expenses, wallets, month);
  const walletMonthTotal = walletSlices.reduce((sum, slice) => sum + slice.value, 0);
  const walletColorFor = (walletId: string | null) => {
    if (walletId === null) {
      return theme.categoryFallback;
    }
    const index = wallets.findIndex((w) => w.id === walletId);
    return theme.categoryPalette[index % theme.categoryPalette.length];
  };
  const walletPieData = walletSlices.map((slice) => ({
    value: slice.value,
    color: walletColorFor(slice.walletId),
  }));
  const walletWeeklyUsage = topWalletByWeek(expenses, wallets, month);

  const budgetRows = budgetVsActual(budgets, expenses, categories, month);
  const budgetedCategoryIds = new Set(budgetRows.map((row) => row.budget.categoryId));
  const unbudgetedCategories = categories.filter((c) => !budgetedCategoryIds.has(c.id));

  function resetBudgetForm() {
    setBudgetForm(initialBudgetForm);
  }

  function startEditBudget(budget: Budget) {
    setBudgetForm({
      editingId: budget.id,
      categoryId: budget.categoryId,
      limitAmountText: String(budget.limitAmount),
      alertThreshold: String(budget.alertThreshold),
    });
  }

  function confirmDeleteBudget(budget: Budget) {
    Alert.alert('Delete budget?', 'This budget will be permanently deleted.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          removeBudget(budget.id).catch((err) => {
            Alert.alert('Failed to delete', err instanceof Error ? err.message : 'Unknown error');
          });
          if (budgetForm.editingId === budget.id) {
            resetBudgetForm();
          }
        },
      },
    ]);
  }

  async function submitBudgetForm() {
    const limitAmount = Number(budgetForm.limitAmountText);
    if (!Number.isFinite(limitAmount) || limitAmount <= 0) {
      Alert.alert('Invalid amount', 'Enter a budget amount greater than zero.');
      return;
    }
    if (!budgetForm.editingId && !budgetForm.categoryId) {
      Alert.alert('Missing category', 'Select a category.');
      return;
    }
    if (!account) {
      Alert.alert('Not ready', 'The app is still starting up — try again in a moment.');
      return;
    }

    setSavingBudget(true);
    try {
      if (budgetForm.editingId) {
        await editBudget(budgetForm.editingId, {
          limitAmount,
          alertThreshold: Number(budgetForm.alertThreshold),
        });
      } else {
        await addBudget({
          userId: account.id,
          categoryId: budgetForm.categoryId as string,
          limitAmount,
          month,
          alertThreshold: Number(budgetForm.alertThreshold),
        });
      }
      resetBudgetForm();
    } catch (err) {
      Alert.alert('Failed to save budget', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSavingBudget(false);
    }
  }

  async function handleExportCsv() {
    if (expenses.length === 0) {
      Alert.alert('Nothing to export', 'Add some expenses first.');
      return;
    }
    setExporting(true);
    try {
      const csv = expensesToCsv(expenses, categories);
      const file = new File(Paths.cache, `expenses-${today()}.csv`);
      file.create({ overwrite: true, intermediates: true });
      file.write(csv);
      if (!(await isAvailableAsync())) {
        Alert.alert('Sharing unavailable', 'This device cannot share files.');
        return;
      }
      await shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: 'Export Expenses' });
    } catch (err) {
      Alert.alert('Export failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setExporting(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Reports</Text>

      <MonthPicker month={selectedMonth} onChange={setSelectedMonth} />

      <View style={[styles.card, { backgroundColor: Colors[colorScheme].card }]}>
        <Text style={styles.sectionTitle}>Spending by Category</Text>
        {categorySlices.length > 0 ? (
          <>
            <View style={styles.pieRow}>
              <PieChart
                data={pieData}
                donut
                radius={90}
                innerRadius={55}
                centerLabelComponent={() => (
                  <Text style={styles.pieCenterLabel}>{formatCurrency(monthTotal, currency)}</Text>
                )}
              />
            </View>
            <View style={styles.legend}>
              {categorySlices.map((slice) => (
                <View key={slice.categoryId} style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: slice.color }]} />
                  <Text style={styles.legendText}>
                    {slice.name} · {formatCurrency(slice.value, currency)}
                  </Text>
                </View>
              ))}
            </View>
          </>
        ) : (
          <Text style={styles.emptyText}>No expenses this month yet.</Text>
        )}
      </View>

      <View style={[styles.card, { backgroundColor: Colors[colorScheme].card }]}>
        <Text style={styles.sectionTitle}>Payment Methods</Text>
        {walletSlices.length > 0 ? (
          <>
            <View style={styles.pieRow}>
              <PieChart
                data={walletPieData}
                donut
                radius={90}
                innerRadius={55}
                centerLabelComponent={() => (
                  <Text style={styles.pieCenterLabel}>
                    {formatCurrency(walletMonthTotal, currency)}
                  </Text>
                )}
              />
            </View>
            <View style={styles.legend}>
              {walletSlices.map((slice) => (
                <View key={slice.walletId ?? 'unassigned'} style={styles.legendRow}>
                  <View
                    style={[
                      styles.legendDot,
                      { backgroundColor: walletColorFor(slice.walletId) },
                    ]}
                  />
                  <Text style={styles.legendText}>
                    {slice.name} ·{' '}
                    {walletMonthTotal > 0 ? Math.round((slice.value / walletMonthTotal) * 100) : 0}%
                    · {formatCurrency(slice.value, currency)}
                  </Text>
                </View>
              ))}
            </View>

            <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>
              Most-used wallet by week
            </Text>
            {walletWeeklyUsage.map((point) => (
              <Text key={point.label} style={styles.weeklyUsageText}>
                {point.label}:{' '}
                {point.topWalletName
                  ? `${point.topWalletName} (${formatCurrency(point.topWalletAmount, currency)})`
                  : 'No expenses'}
              </Text>
            ))}
          </>
        ) : (
          <Text style={styles.emptyText}>No expenses this month yet.</Text>
        )}
      </View>

      <View style={[styles.card, { backgroundColor: Colors[colorScheme].card }]}>
        <Text style={styles.sectionTitle}>Spending Trend</Text>
        <ChipPicker
          options={REPORT_VIEW_OPTIONS}
          selectedValue={reportView}
          onSelect={setReportView}
        />
        {hasTrendData ? (
          <View style={styles.chartRow}>
            {reportView === 'monthly' && (
              <LineChart
                data={lineData}
                thickness={2}
                color={Colors[colorScheme].primary}
                hideDataPoints
                noOfSections={4}
                height={180}
                isAnimated
                xAxisLabelTextStyle={{ color: Colors[colorScheme].text, fontSize: 10 }}
                yAxisTextStyle={{ color: Colors[colorScheme].text }}
              />
            )}
            {reportView === 'daily' && (
              <BarChart
                data={dailyBarData}
                barWidth={dailyBarData.length > 20 ? 6 : 10}
                spacing={dailyBarData.length > 20 ? 4 : 8}
                noOfSections={4}
                height={180}
                isAnimated
                xAxisLabelTextStyle={{ color: Colors[colorScheme].text, fontSize: 9 }}
                yAxisTextStyle={{ color: Colors[colorScheme].text }}
              />
            )}
            {reportView === 'weekly' && (
              <BarChart
                data={weeklyBarData}
                barWidth={40}
                spacing={20}
                noOfSections={4}
                height={180}
                isAnimated
                xAxisLabelTextStyle={{ color: Colors[colorScheme].text, fontSize: 9 }}
                yAxisTextStyle={{ color: Colors[colorScheme].text }}
              />
            )}
          </View>
        ) : (
          <Text style={styles.emptyText}>No expenses this month yet.</Text>
        )}
      </View>

      <View style={[styles.card, { backgroundColor: Colors[colorScheme].card }]}>
        <Text style={styles.sectionTitle}>Budgets</Text>
        {budgetRows.length === 0 && (
          <Text style={styles.emptyText}>No budgets set for this month yet.</Text>
        )}
        {budgetRows.map((row) => {
          const barColor = row.isOverLimit
            ? Colors[colorScheme].error
            : Colors[colorScheme].success;
          const barWidth =
            `${Math.min(100, (row.actual / row.budget.limitAmount) * 100)}%` as const;
          return (
            <View key={row.budget.id} style={styles.budgetRow}>
              <View style={styles.budgetRowHeader}>
                <View style={[styles.iconCircle, { backgroundColor: row.categoryColor }]}>
                  <Ionicons name={row.categoryIcon as IoniconName} size={16} color="#fff" />
                </View>
                <Text style={styles.budgetRowTitle}>{row.categoryName}</Text>
                <Pressable onPress={() => startEditBudget(row.budget)} hitSlop={8}>
                  <Ionicons name="create-outline" size={20} color={Colors[colorScheme].text} />
                </Pressable>
                <Pressable onPress={() => confirmDeleteBudget(row.budget)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={20} color={Colors[colorScheme].error} />
                </Pressable>
              </View>
              <View style={[styles.barTrack, { backgroundColor: Colors[colorScheme].border }]}>
                <View style={[styles.barFill, { width: barWidth, backgroundColor: barColor }]} />
              </View>
              <Text style={styles.budgetCaption}>
                {formatCurrency(row.actual, currency)} of{' '}
                {formatCurrency(row.budget.limitAmount, currency)} ·{' '}
                {row.isOverLimit
                  ? `${formatCurrency(Math.abs(row.remaining), currency)} over`
                  : `${formatCurrency(row.remaining, currency)} left`}
              </Text>
            </View>
          );
        })}

        <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>
          {budgetForm.editingId ? 'Edit Budget' : 'Add Budget'}
        </Text>

        {budgetForm.editingId ? (
          <Text style={styles.lockedCategoryText}>
            {categories.find((c) => c.id === budgetForm.categoryId)?.name ?? 'Category'}
          </Text>
        ) : (
          <ChipPicker
            options={unbudgetedCategories.map((c) => ({
              value: c.id,
              label: c.name,
              color: c.color,
              icon: c.icon as IoniconName,
            }))}
            selectedValue={budgetForm.categoryId}
            onSelect={(id) => setBudgetForm((f) => ({ ...f, categoryId: id }))}
          />
        )}

        <TextInput
          style={[
            styles.input,
            { color: Colors[colorScheme].text, borderColor: Colors[colorScheme].border },
          ]}
          value={budgetForm.limitAmountText}
          onChangeText={(text) => setBudgetForm((f) => ({ ...f, limitAmountText: text }))}
          placeholder="Budget amount"
          placeholderTextColor={Colors[colorScheme].tabIconDefault}
          keyboardType="decimal-pad"
        />

        <ChipPicker
          options={ALERT_THRESHOLD_OPTIONS}
          selectedValue={budgetForm.alertThreshold}
          onSelect={(value) => setBudgetForm((f) => ({ ...f, alertThreshold: value }))}
        />

        <View style={styles.budgetFormActions}>
          <Pressable
            onPress={submitBudgetForm}
            disabled={savingBudget}
            style={[
              styles.submitButton,
              { backgroundColor: Colors[colorScheme].primary },
              savingBudget && styles.disabled,
            ]}
          >
            <Text style={styles.submitButtonText}>
              {savingBudget ? 'Saving…' : budgetForm.editingId ? 'Save Changes' : 'Add Budget'}
            </Text>
          </Pressable>
          {budgetForm.editingId && (
            <Pressable onPress={resetBudgetForm} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          )}
        </View>
      </View>

      <Pressable
        onPress={handleExportCsv}
        disabled={exporting}
        style={[
          styles.submitButton,
          { backgroundColor: Colors[colorScheme].primary },
          exporting && styles.disabled,
        ]}
      >
        <Text style={styles.submitButtonText}>
          {exporting ? 'Exporting…' : 'Export Expenses (CSV)'}
        </Text>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
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
  sectionLabel: {
    fontSize: 13,
    opacity: 0.7,
  },
  sectionLabelSpaced: {
    marginTop: 8,
  },
  emptyText: {
    opacity: 0.7,
  },
  pieRow: {
    alignItems: 'center',
    marginTop: 8,
  },
  pieCenterLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  legend: {
    marginTop: 12,
    gap: 6,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 13,
  },
  weeklyUsageText: {
    fontSize: 13,
    opacity: 0.8,
    marginTop: 2,
  },
  chartRow: {
    marginTop: 8,
  },
  budgetRow: {
    gap: 6,
    paddingVertical: 8,
  },
  budgetRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  budgetRowTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  barTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: 8,
    borderRadius: 4,
  },
  budgetCaption: {
    fontSize: 12,
    opacity: 0.7,
  },
  lockedCategoryText: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  budgetFormActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  submitButton: {
    marginTop: 8,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    flex: 1,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    marginTop: 8,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  cancelButtonText: {
    fontSize: 15,
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.6,
  },
});
