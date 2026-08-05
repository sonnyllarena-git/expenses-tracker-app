import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { listWalletTransactions } from '@/db/queries/walletTransactions';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useWalletStore } from '@/store/useWalletStore';
import type { WalletTransaction } from '@/types';
import { formatCurrency } from '@/utils/currency';
import { formatDate } from '@/utils/date';

/**
 * Read-only history for a single wallet — fetched directly rather than
 * through a store since it's only ever viewed on this one screen.
 */
export default function WalletTransactionsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const account = useSettingsStore((state) => state.account);
  const wallets = useWalletStore((state) => state.wallets);
  const colorScheme = useColorScheme();
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const wallet = wallets.find((w) => w.id === id);

  useEffect(() => {
    if (!id) {
      return;
    }
    listWalletTransactions(id)
      .then(setTransactions)
      .finally(() => setLoading(false));
  }, [id]);

  const currency = wallet?.currency ?? account?.currency ?? 'PHP';

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: wallet?.name ?? 'Wallet History' }} />
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          transactions.length === 0 ? styles.emptyContent : styles.listContent
        }
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: Colors[colorScheme].border }]} />
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {loading ? 'Loading…' : 'No transactions yet.'}
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowMain}>
              <Text style={styles.rowTitle}>
                {item.description || (item.type === 'debit' ? 'Expense' : 'Credit')}
              </Text>
              <Text style={styles.rowDate}>{formatDate(item.date)}</Text>
            </View>
            <Text
              style={[
                styles.rowAmount,
                {
                  color:
                    item.type === 'debit' ? Colors[colorScheme].error : Colors[colorScheme].success,
                },
              ]}
            >
              {item.type === 'debit' ? '-' : '+'}
              {formatCurrency(item.amount, currency)}
            </Text>
          </View>
        )}
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
    justifyContent: 'space-between',
    paddingVertical: 12,
    gap: 12,
  },
  rowMain: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  rowDate: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 2,
  },
  rowAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
});
