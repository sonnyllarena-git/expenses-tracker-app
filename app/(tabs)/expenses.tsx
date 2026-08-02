import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState, type ComponentProps } from 'react';
import { Alert, FlatList, Pressable, StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useCategoryStore } from '@/store/useCategoryStore';
import { useExpenseStore } from '@/store/useExpenseStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import type { Expense } from '@/types';
import { formatCurrency } from '@/utils/currency';
import { formatDate } from '@/utils/date';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export default function ExpenseListScreen() {
  const account = useSettingsStore((state) => state.account);
  const expenses = useExpenseStore((state) => state.expenses);
  const loadExpenses = useExpenseStore((state) => state.load);
  const removeExpense = useExpenseStore((state) => state.removeExpense);
  const categories = useCategoryStore((state) => state.categories);
  const colorScheme = useColorScheme();
  const [refreshing, setRefreshing] = useState(false);

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

  function confirmDelete(expense: Expense) {
    Alert.alert(
      'Delete expense?',
      expense.description
        ? `"${expense.description}" will be permanently deleted.`
        : 'This expense will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            removeExpense(expense.id).catch((err) => {
              Alert.alert('Failed to delete', err instanceof Error ? err.message : 'Unknown error');
            });
          },
        },
      ]
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={expenses.length === 0 ? styles.emptyContent : styles.listContent}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: Colors[colorScheme].border }]} />
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No expenses yet. Add one from the Add tab, then pull down here to refresh.
          </Text>
        }
        renderItem={({ item }) => {
          const category = categories.find((c) => c.id === item.categoryId);
          return (
            <Pressable
              onLongPress={() => confirmDelete(item)}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            >
              <View style={[styles.iconCircle, { backgroundColor: category?.color ?? '#999' }]}>
                <Ionicons
                  name={(category?.icon as IoniconName) ?? 'help-circle'}
                  size={18}
                  color="#fff"
                />
              </View>
              <View style={styles.rowMain}>
                <Text style={styles.rowTitle}>{category?.name ?? 'Uncategorized'}</Text>
                {!!item.description && <Text style={styles.rowSubtitle}>{item.description}</Text>}
                <Text style={styles.rowDate}>{formatDate(item.date)}</Text>
              </View>
              <Text style={styles.rowAmount}>
                {formatCurrency(item.amount, account?.currency ?? 'PHP')}
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    paddingVertical: 12,
    gap: 12,
  },
  rowPressed: {
    opacity: 0.6,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowMain: {
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
