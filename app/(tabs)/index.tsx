import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useCategoryStore } from '@/store/useCategoryStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { formatCurrency } from '@/utils/currency';

export default function DashboardScreen() {
  const { account, init } = useSettingsStore();
  const { categories, load: loadCategories } = useCategoryStore();
  const [status, setStatus] = useState('Starting up…');
  const colorScheme = useColorScheme();

  useEffect(() => {
    (async () => {
      const acc = await init();
      await loadCategories(acc.id);
      setStatus('Ready');
    })();
  }, [init, loadCategories]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dashboard</Text>
      <Text style={styles.subtitle}>Monthly summary, charts, and recent expenses land here.</Text>

      <View style={[styles.statusCard, { backgroundColor: Colors[colorScheme].card }]}>
        <Text style={styles.statusLabel}>Local database</Text>
        <Text style={styles.statusValue}>{status}</Text>
        {account && (
          <>
            <Text style={styles.statusLabel}>Account</Text>
            <Text style={styles.statusValue}>
              {account.accountType} · {account.currency}
            </Text>
          </>
        )}
        <Text style={styles.statusLabel}>Categories seeded</Text>
        <Text style={styles.statusValue}>{categories.length}</Text>
        {account && (
          <Text style={styles.statusValue}>
            This month so far: {formatCurrency(0, account.currency)}
          </Text>
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
