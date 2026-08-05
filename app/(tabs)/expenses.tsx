import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState, type ComponentProps } from 'react';
import { FlatList, Image, Pressable, StyleSheet, TextInput } from 'react-native';

import { ChipPicker, type ChipOption } from '@/components/ChipPicker';
import { RecurringAndLoansSection } from '@/components/RecurringAndLoansSection';
import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useBudgetStore } from '@/store/useBudgetStore';
import { useCategoryStore } from '@/store/useCategoryStore';
import { useExpenseStore } from '@/store/useExpenseStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { theme } from '@/theme';
import { hasOverThresholdBudget } from '@/utils/budget';
import { formatCurrency } from '@/utils/currency';
import { currentMonth, formatDate, isValidDateString } from '@/utils/date';

type IoniconName = ComponentProps<typeof Ionicons>['name'];
type ExpensesSubTab = 'expenses' | 'recurring';

const ALL_CATEGORIES = '__all__';

const SUB_TAB_OPTIONS: ChipOption<ExpensesSubTab>[] = [
  { value: 'expenses', label: 'Expenses' },
  { value: 'recurring', label: 'Recurring & Loans' },
];

export default function ExpenseListScreen() {
  const account = useSettingsStore((state) => state.account);
  const expenses = useExpenseStore((state) => state.expenses);
  const loadExpenses = useExpenseStore((state) => state.load);
  const categories = useCategoryStore((state) => state.categories);
  const budgets = useBudgetStore((state) => state.budgets);
  const loadBudgets = useBudgetStore((state) => state.load);
  const colorScheme = useColorScheme();
  const router = useRouter();
  // Lets the Dashboard's "Upcoming Bills" card deep-link straight into this
  // sub-tab via router.push({ pathname: '/(tabs)/expenses', params: { tab: 'recurring' } }).
  const params = useLocalSearchParams<{ tab?: string }>();
  // Lazy initializer so a cold navigation straight into this screen (e.g. the
  // deep link above) lands on the right sub-tab immediately — the in-render
  // sync below only catches `tab` changing while this screen stays mounted.
  const [activeTab, setActiveTab] = useState<ExpensesSubTab>(() =>
    params.tab === 'recurring' ? 'recurring' : 'expenses'
  );
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(ALL_CATEGORIES);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Switch sub-tab when `tab` param changes (in-render adjustment, not a
  // useEffect — see https://react.dev/learn/you-might-not-need-an-effect).
  const [syncedTabParam, setSyncedTabParam] = useState(params.tab);
  if (params.tab !== syncedTabParam) {
    setSyncedTabParam(params.tab);
    if (params.tab === 'recurring') {
      setActiveTab('recurring');
    }
  }

  // Filters are transient screen state, not a saved preference — reset them
  // whenever the user navigates away so the tab always starts unfiltered.
  useFocusEffect(
    useCallback(() => {
      return () => {
        setSelectedCategoryId(ALL_CATEGORIES);
        setSearchQuery('');
        setDateFrom('');
        setDateTo('');
      };
    }, [])
  );

  useEffect(() => {
    if (account) {
      loadBudgets(account.id);
    }
  }, [account, loadBudgets]);

  const showBudgetWarning =
    (account?.budgetAlertsEnabled ?? true) &&
    hasOverThresholdBudget(budgets, expenses, currentMonth());

  const onRefresh = useCallback(async () => {
    if (!account) {
      return;
    }
    setRefreshing(true);
    try {
      await loadExpenses(account.id);
    } finally {
      setRefreshing(false);
    }
  }, [account, loadExpenses]);

  function openEdit(id: string) {
    router.push({ pathname: '/edit-expense/[id]', params: { id } });
  }

  const trimmedQuery = searchQuery.trim().toLowerCase();
  const validDateFrom = isValidDateString(dateFrom) ? dateFrom : null;
  const validDateTo = isValidDateString(dateTo) ? dateTo : null;
  const hasActiveFilter =
    selectedCategoryId !== ALL_CATEGORIES || !!trimmedQuery || !!validDateFrom || !!validDateTo;

  const filteredExpenses = expenses.filter((e) => {
    if (selectedCategoryId !== ALL_CATEGORIES && e.categoryId !== selectedCategoryId) {
      return false;
    }
    if (trimmedQuery && !e.description.toLowerCase().includes(trimmedQuery)) {
      return false;
    }
    if (validDateFrom && e.date < validDateFrom) {
      return false;
    }
    if (validDateTo && e.date > validDateTo) {
      return false;
    }
    return true;
  });

  const filteredTotal = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <View style={styles.container}>
      <View style={styles.subTabRow}>
        <ChipPicker options={SUB_TAB_OPTIONS} selectedValue={activeTab} onSelect={setActiveTab} />
      </View>

      {activeTab === 'recurring' ? (
        <RecurringAndLoansSection />
      ) : (
        <>
          {showBudgetWarning && (
            <View
              style={[
                styles.warningBanner,
                { backgroundColor: `${Colors[colorScheme].warning}22` },
              ]}
            >
              <Ionicons name="warning-outline" size={18} color={Colors[colorScheme].warning} />
              <Text style={[styles.warningText, { color: Colors[colorScheme].warning }]}>
                One or more budgets are near or over their limit this month.
              </Text>
            </View>
          )}

          <View style={styles.filterBar}>
            <TextInput
              style={[
                styles.searchInput,
                { color: Colors[colorScheme].text, borderColor: Colors[colorScheme].border },
              ]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search description..."
              placeholderTextColor={Colors[colorScheme].tabIconDefault}
            />

            <View style={styles.dateRangeRow}>
              <TextInput
                style={[
                  styles.dateInput,
                  { color: Colors[colorScheme].text, borderColor: Colors[colorScheme].border },
                ]}
                value={dateFrom}
                onChangeText={setDateFrom}
                placeholder="From YYYY-MM-DD"
                placeholderTextColor={Colors[colorScheme].tabIconDefault}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TextInput
                style={[
                  styles.dateInput,
                  { color: Colors[colorScheme].text, borderColor: Colors[colorScheme].border },
                ]}
                value={dateTo}
                onChangeText={setDateTo}
                placeholder="To YYYY-MM-DD"
                placeholderTextColor={Colors[colorScheme].tabIconDefault}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <ChipPicker
              options={[
                { value: ALL_CATEGORIES, label: 'All' },
                ...categories.map((c) => ({
                  value: c.id,
                  label: c.name,
                  color: c.color,
                  icon: c.icon as IoniconName,
                })),
              ]}
              selectedValue={selectedCategoryId}
              onSelect={setSelectedCategoryId}
            />
          </View>

          <Text style={styles.totalText}>
            Total: {formatCurrency(filteredTotal, account?.currency ?? 'PHP')} ·{' '}
            {filteredExpenses.length} {filteredExpenses.length === 1 ? 'expense' : 'expenses'}
          </Text>

          <FlatList
            data={filteredExpenses}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={
              filteredExpenses.length === 0 ? styles.emptyContent : styles.listContent
            }
            refreshing={refreshing}
            onRefresh={onRefresh}
            ItemSeparatorComponent={() => (
              <View style={[styles.separator, { backgroundColor: Colors[colorScheme].border }]} />
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                {hasActiveFilter
                  ? 'No expenses match these filters.'
                  : 'No expenses yet. Add one from the Add tab, then pull down here to refresh.'}
              </Text>
            }
            renderItem={({ item }) => {
              const category = categories.find((c) => c.id === item.categoryId);
              return (
                <View style={styles.row}>
                  <Pressable
                    onPress={() => openEdit(item.id)}
                    style={({ pressed }) => [styles.rowMain, pressed && styles.rowPressed]}
                  >
                    {item.receiptPhotoPath ? (
                      <Image source={{ uri: item.receiptPhotoPath }} style={styles.iconCircle} />
                    ) : (
                      <View
                        style={[
                          styles.iconCircle,
                          { backgroundColor: category?.color ?? theme.categoryFallback },
                        ]}
                      >
                        <Ionicons
                          name={(category?.icon as IoniconName) ?? 'help-circle'}
                          size={18}
                          color="#fff"
                        />
                      </View>
                    )}
                    <View style={styles.rowText}>
                      <Text style={styles.rowTitle}>{category?.name ?? 'Uncategorized'}</Text>
                      {!!item.description && (
                        <Text style={styles.rowSubtitle}>{item.description}</Text>
                      )}
                      <Text style={styles.rowDate}>{formatDate(item.date)}</Text>
                    </View>
                    <Text style={styles.rowAmount}>
                      {formatCurrency(item.amount, account?.currency ?? 'PHP')}
                    </Text>
                  </Pressable>
                  <Pressable onPress={() => openEdit(item.id)} hitSlop={8} style={styles.rowIcon}>
                    <Ionicons name="create-outline" size={20} color={Colors[colorScheme].text} />
                  </Pressable>
                </View>
              );
            }}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  subTabRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  totalText: {
    paddingHorizontal: 16,
    paddingTop: 8,
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.8,
  },
  filterBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 8,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  dateRangeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dateInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  listContent: {
    padding: 16,
  },
  emptyContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.7,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  rowPressed: {
    opacity: 0.6,
  },
  rowIcon: {
    padding: 6,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  rowSubtitle: {
    fontSize: 13,
    opacity: 0.7,
  },
  rowDate: {
    fontSize: 12,
    opacity: 0.5,
    marginTop: 2,
  },
  rowAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
});
