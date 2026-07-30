import { create } from 'zustand';

import { listBudgets } from '@/db/queries/budgets';
import type { Budget } from '@/types';

interface BudgetState {
  budgets: Budget[];
  isLoading: boolean;
  load: (userId: string) => Promise<void>;
}

export const useBudgetStore = create<BudgetState>((set) => ({
  budgets: [],
  isLoading: false,
  load: async (userId: string) => {
    set({ isLoading: true });
    const budgets = await listBudgets(userId);
    set({ budgets, isLoading: false });
  },
}));
