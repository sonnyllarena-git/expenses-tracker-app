import { openDatabaseAsync } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';

import * as schema from './schema';

// Assigned by initDb() before anything reads it — DatabaseProvider gates all
// rendering (and therefore all querying) on that promise resolving first.
export let db: ReturnType<typeof drizzle<typeof schema>>;

let initPromise: Promise<void> | null = null;

/**
 * openDatabaseSync's web backend fakes synchronicity with a Web Worker +
 * SharedArrayBuffer/Atomics busy-wait, which can time out (OPFS access is
 * inherently async). openDatabaseAsync avoids that fragile path entirely and
 * works identically on native, so it's used on every platform, not just web.
 */
export function initDb(): Promise<void> {
  if (!initPromise) {
    initPromise = openDatabaseAsync('expense-tracker.db', { enableChangeListener: true }).then(
      (sqlite) => {
        db = drizzle(sqlite, { schema });
      }
    );
  }
  return initPromise;
}
