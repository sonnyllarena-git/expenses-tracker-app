import { create } from 'zustand';

import { getOrCreateLocalAccount } from '@/db/queries/account';
import type { UserAccount } from '@/types';

interface SettingsState {
  account: UserAccount | null;
  isLoading: boolean;
  init: () => Promise<UserAccount>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  account: null,
  isLoading: false,
  init: async () => {
    set({ isLoading: true });
    const account = await getOrCreateLocalAccount();
    set({ account, isLoading: false });
    return account;
  },
}));
