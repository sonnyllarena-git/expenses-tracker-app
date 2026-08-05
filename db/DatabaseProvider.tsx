import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { useEffect, useState, type PropsWithChildren } from 'react';
import { StyleSheet } from 'react-native';

import { db, initDb } from './client';
import migrations from './migrations/migrations';
import { Text, View } from '@/components/Themed';
import { useCategoryStore } from '@/store/useCategoryStore';
import { useExpenseStore } from '@/store/useExpenseStore';
import { useIncomeStore } from '@/store/useIncomeStore';
import { useRecurringStore } from '@/store/useRecurringStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useWalletStore } from '@/store/useWalletStore';

function StatusScreen({ title, message }: { title?: string; message?: string }) {
  return (
    <View style={styles.center}>
      {title && <Text style={styles.errorTitle}>{title}</Text>}
      <Text>{message ?? 'Preparing local database…'}</Text>
    </View>
  );
}

/**
 * Gates rendering on the database opening and its migration run completing.
 * Migrations can't be read off disk on-device — they're bundled at build time
 * (see babel.config.js's inline-import plugin) and applied here on every launch.
 */
export function DatabaseProvider({ children }: PropsWithChildren) {
  const [dbReady, setDbReady] = useState(false);
  const [openError, setOpenError] = useState<Error | null>(null);

  useEffect(() => {
    initDb()
      .then(() => setDbReady(true))
      .catch(setOpenError);
  }, []);

  if (openError) {
    return <StatusScreen title="Database failed to open" message={openError.message} />;
  }

  if (!dbReady) {
    return <StatusScreen />;
  }

  return <MigrationGate>{children}</MigrationGate>;
}

function MigrationGate({ children }: PropsWithChildren) {
  const { success, error } = useMigrations(db, migrations);

  if (error) {
    return <StatusScreen title="Database migration failed" message={error.message} />;
  }

  if (!success) {
    return <StatusScreen />;
  }

  return <BootstrapGate>{children}</BootstrapGate>;
}

/**
 * Loads the single local account, then its categories (seeding the 7 defaults
 * on first launch), materializes any due recurring expenses, then loads
 * expenses (picking up both prior and newly-materialized rows in one load),
 * then the recurring templates themselves, then income, then wallets. Runs
 * once migrations have succeeded.
 */
function BootstrapGate({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<Error | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const account = await useSettingsStore.getState().init();
        await useCategoryStore.getState().load(account.id);
        await useRecurringStore.getState().materialize(account.id);
        await useExpenseStore.getState().load(account.id);
        await useRecurringStore.getState().load(account.id);
        await useIncomeStore.getState().load(account.id);
        await useWalletStore.getState().load(account.id);
        setReady(true);
      } catch (err) {
        setBootstrapError(err instanceof Error ? err : new Error(String(err)));
      }
    })();
  }, []);

  if (bootstrapError) {
    return <StatusScreen title="App failed to start" message={bootstrapError.message} />;
  }

  if (!ready) {
    return <StatusScreen />;
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
});
