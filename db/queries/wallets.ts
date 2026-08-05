import { and, eq } from 'drizzle-orm';

import { db } from '../client';
import { wallets } from '../schema';
import { generateId } from '@/utils/uuid';
import type { Wallet, WalletType } from '@/types';

export function toWallet(row: typeof wallets.$inferSelect): Wallet {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    type: row.type as WalletType,
    balance: row.balance,
    currency: row.currency,
    isArchived: row.isArchived,
    createdAt: row.createdAt,
  };
}

export interface NewWalletInput {
  userId: string;
  name: string;
  type: WalletType;
  balance: number;
  currency?: string;
}

/** Active (non-archived) wallets only. */
export async function listWallets(userId: string): Promise<Wallet[]> {
  const rows = await db
    .select()
    .from(wallets)
    .where(and(eq(wallets.userId, userId), eq(wallets.isArchived, false)));
  return rows.map(toWallet);
}

export async function insertWallet(input: NewWalletInput): Promise<Wallet> {
  if (!Number.isFinite(input.balance)) {
    throw new Error('Wallet balance must be a finite number');
  }

  const [created] = await db
    .insert(wallets)
    .values({
      id: generateId(),
      userId: input.userId,
      name: input.name,
      type: input.type,
      balance: input.balance,
      currency: input.currency ?? 'PHP',
    })
    .returning();

  return toWallet(created);
}

export interface UpdateWalletInput {
  name?: string;
  type?: WalletType;
  balance?: number;
  currency?: string;
}

export async function updateWallet(id: string, input: UpdateWalletInput): Promise<Wallet> {
  if (input.balance !== undefined && !Number.isFinite(input.balance)) {
    throw new Error('Wallet balance must be a finite number');
  }

  const values: Partial<typeof wallets.$inferInsert> = {};
  if (input.name !== undefined) values.name = input.name;
  if (input.type !== undefined) values.type = input.type;
  if (input.balance !== undefined) values.balance = input.balance;
  if (input.currency !== undefined) values.currency = input.currency;

  const [updated] = await db.update(wallets).set(values).where(eq(wallets.id, id)).returning();

  if (!updated) {
    throw new Error(`No wallet found with id ${id}`);
  }

  return toWallet(updated);
}

/** Soft delete — existing expenses/wallet_transactions keep their walletId intact. */
export async function archiveWallet(id: string): Promise<void> {
  await db.update(wallets).set({ isArchived: true }).where(eq(wallets.id, id));
}
