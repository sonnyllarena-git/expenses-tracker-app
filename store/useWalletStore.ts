import { create } from 'zustand';

import {
  archiveWallet as archiveWalletRow,
  insertWallet,
  listWallets,
  updateWallet,
  type NewWalletInput,
  type UpdateWalletInput,
} from '@/db/queries/wallets';
import type { Wallet } from '@/types';

interface WalletState {
  wallets: Wallet[];
  isLoading: boolean;
  load: (userId: string) => Promise<void>;
  addWallet: (input: NewWalletInput) => Promise<Wallet>;
  editWallet: (id: string, input: UpdateWalletInput) => Promise<Wallet>;
  archiveWallet: (id: string) => Promise<void>;
  /** Sum of every loaded (non-archived) wallet's balance. */
  netWorth: () => number;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  wallets: [],
  isLoading: false,
  load: async (userId: string) => {
    set({ isLoading: true });
    try {
      const wallets = await listWallets(userId);
      set({ wallets });
    } finally {
      set({ isLoading: false });
    }
  },
  addWallet: async (input: NewWalletInput) => {
    const wallet = await insertWallet(input);
    set({ wallets: [wallet, ...get().wallets] });
    return wallet;
  },
  editWallet: async (id: string, input: UpdateWalletInput) => {
    const wallet = await updateWallet(id, input);
    set({ wallets: get().wallets.map((existing) => (existing.id === id ? wallet : existing)) });
    return wallet;
  },
  archiveWallet: async (id: string) => {
    await archiveWalletRow(id);
    set({ wallets: get().wallets.filter((existing) => existing.id !== id) });
  },
  netWorth: () => get().wallets.reduce((sum, wallet) => sum + wallet.balance, 0),
}));
