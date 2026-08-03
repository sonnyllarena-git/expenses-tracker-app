import { create } from 'zustand';

import {
  deleteBudget,
  insertBudget,
  listBudgets,
  updateBudget,
  type NewBudgetInput,
  type UpdateBudgetInput,
} from '@/db/queries/budgets';
import type { Budget } from '@/types';

interface BudgetState {
  budgets: Budget[];
  isLoading: boolean;
  load: (userId: string) => Promise<void>;
  addBudget: (input: NewBudgetInput) => Promise<Budget>;
  editBudget: (id: string, input: UpdateBudgetInput) => Promise<Budget>;
  removeBudget: (id: string) => Promise<void>;
}

export const useBudgetStore = create<BudgetState>((set, get) => ({
  budgets: [],
  isLoading: false,
  load: async (userId: string) => {
    set({ isLoading: true });
    try {
      const budgets = await listBudgets(userId);
      set({ budgets });
    } finally {
      set({ isLoading: false });
    }
  },
  addBudget: async (input: NewBudgetInput) => {
    const budget = await insertBudget(input);
    set({ budgets: [budget, ...get().budgets] });
    return budget;
  },
  editBudget: async (id: string, input: UpdateBudgetInput) => {
    const budget = await updateBudget(id, input);
    set({ budgets: get().budgets.map((existing) => (existing.id === id ? budget : existing)) });
    return budget;
  },
  removeBudget: async (id: string) => {
    await deleteBudget(id);
    set({ budgets: get().budgets.filter((existing) => existing.id !== id) });
  },
}));
