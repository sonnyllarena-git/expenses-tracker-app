import { eq } from 'drizzle-orm';

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
    payday: row.payday,
    aiChatHistoryEnabled: row.aiChatHistoryEnabled,
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

export interface UpdateAccountInput {
  accountType?: AccountType;
  currency?: string;
  sharingEnabled?: boolean;
  notificationsEnabled?: boolean;
  budgetAlertsEnabled?: boolean;
  payday?: number;
  aiChatHistoryEnabled?: boolean;
}

export async function updateAccount(id: string, input: UpdateAccountInput): Promise<UserAccount> {
  if (input.payday !== undefined && (input.payday < 1 || input.payday > 31)) {
    throw new Error('Payday must be between 1 and 31');
  }

  const values: Partial<typeof users.$inferInsert> = {};
  if (input.accountType !== undefined) values.accountType = input.accountType;
  if (input.currency !== undefined) values.currency = input.currency;
  if (input.sharingEnabled !== undefined) values.sharingEnabled = input.sharingEnabled;
  if (input.notificationsEnabled !== undefined)
    values.notificationsEnabled = input.notificationsEnabled;
  if (input.budgetAlertsEnabled !== undefined)
    values.budgetAlertsEnabled = input.budgetAlertsEnabled;
  if (input.payday !== undefined) values.payday = input.payday;
  if (input.aiChatHistoryEnabled !== undefined)
    values.aiChatHistoryEnabled = input.aiChatHistoryEnabled;

  const [updated] = await db.update(users).set(values).where(eq(users.id, id)).returning();

  if (!updated) {
    throw new Error(`No account found with id ${id}`);
  }

  return toUserAccount(updated);
}
