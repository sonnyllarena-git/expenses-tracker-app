import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { type PropsWithChildren } from 'react';
import { StyleSheet } from 'react-native';

import { db } from './client';
import migrations from './migrations/migrations';
import { Text, View } from '@/components/Themed';

/**
 * Gates rendering on the local SQLite migration run completing.
 * Migrations can't be read off disk on-device — they're bundled at build time
 * (see babel.config.js's inline-import plugin) and applied here on every launch.
 */
export function DatabaseProvider({ children }: PropsWithChildren) {
  const { success, error } = useMigrations(db, migrations);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Database failed to start</Text>
        <Text>{error.message}</Text>
      </View>
    );
  }

  if (!success) {
    return (
      <View style={styles.center}>
        <Text>Preparing local database…</Text>
      </View>
    );
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
