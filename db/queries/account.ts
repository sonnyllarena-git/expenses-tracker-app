import { db } from '../client';
import { users } from '../schema';
import { generateId } from '@/utils/uuid';
import type { AccountType, UserAccount } from '@/types';

function toUserAccount(row: typeof users.$inferSelect): UserAccount {
  return {
    id: row.id,
    email: row.email,
    accountType: row.accountType as AccountType,
    currency: row.currency,
    sharingEnabled: row.sharingEnabled,
    notificationsEnabled: row.notificationsEnabled,
    budgetAlertsEnabled: row.budgetAlertsEnabled,
    createdAt: row.createdAt,
  };
}

/**
 * Phase 1 supports exactly one local account per install (see DATABASE_SCHEMA.md).
 * Creates the account on first launch with sensible defaults; returns the existing
 * one on every subsequent launch.
 */
export async function getOrCreateLocalAccount(): Promise<UserAccount> {
  const existing = await db.select().from(users).limit(1);
  if (existing.length > 0) {
    return toUserAccount(existing[0]);
  }

  const [created] = await db
    .insert(users)
    .values({
      id: generateId(),
      email: null,
      accountType: 'personal',
      currency: 'PHP',
    })
    .returning();

  return toUserAccount(created);
}
