import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { useEffect, useState, type PropsWithChildren } from 'react';
import { StyleSheet } from 'react-native';

import { db, initDb } from './client';
import migrations from './migrations/migrations';
import { Text, View } from '@/components/Themed';

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
