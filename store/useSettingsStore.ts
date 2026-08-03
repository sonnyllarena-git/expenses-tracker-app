import { create } from 'zustand';

import {
  getOrCreateLocalAccount,
  updateAccount,
  type UpdateAccountInput,
} from '@/db/queries/account';
import { deleteAllData } from '@/db/queries/dataManagement';
import { useBudgetStore } from '@/store/useBudgetStore';
import { useCategoryStore } from '@/store/useCategoryStore';
import { useExpenseStore } from '@/store/useExpenseStore';
import type { UserAccount } from '@/types';

interface SettingsState {
  account: UserAccount | null;
  isLoading: boolean;
  init: () => Promise<UserAccount>;
  updateAccount: (input: UpdateAccountInput) => Promise<UserAccount>;
  resetAllData: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  account: null,
  isLoading: false,
  init: async () => {
    set({ isLoading: true });
    const account = await getOrCreateLocalAccount();
    set({ account, isLoading: false });
    return account;
  },
  updateAccount: async (input: UpdateAccountInput) => {
    const current = get().account;
    if (!current) {
      throw new Error('No account loaded');
    }
    const account = await updateAccount(current.id, input);
    set({ account });
    return account;
  },
  resetAllData: async () => {
    const current = get().account;
    if (!current) {
      throw new Error('No account loaded');
    }
    await deleteAllData(current.id);
    await Promise.all([
      useCategoryStore.getState().load(current.id),
      useExpenseStore.getState().load(current.id),
      useBudgetStore.getState().load(current.id),
    ]);
  },
}));
