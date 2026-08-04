import { create } from 'zustand';

import {
  deleteIncome,
  insertIncome,
  listIncome,
  updateIncome,
  type NewIncomeInput,
  type UpdateIncomeInput,
} from '@/db/queries/income';
import type { Income } from '@/types';

interface IncomeState {
  income: Income[];
  isLoading: boolean;
  load: (userId: string) => Promise<void>;
  addIncome: (input: NewIncomeInput) => Promise<Income>;
  editIncome: (id: string, input: UpdateIncomeInput) => Promise<Income>;
  removeIncome: (id: string) => Promise<void>;
}

export const useIncomeStore = create<IncomeState>((set, get) => ({
  income: [],
  isLoading: false,
  load: async (userId: string) => {
    set({ isLoading: true });
    try {
      const income = await listIncome(userId);
      set({ income });
    } finally {
      set({ isLoading: false });
    }
  },
  addIncome: async (input: NewIncomeInput) => {
    const created = await insertIncome(input);
    set({ income: [created, ...get().income] });
    return created;
  },
  editIncome: async (id: string, input: UpdateIncomeInput) => {
    const updated = await updateIncome(id, input);
    set({ income: get().income.map((existing) => (existing.id === id ? updated : existing)) });
    return updated;
  },
  removeIncome: async (id: string) => {
    await deleteIncome(id);
    set({ income: get().income.filter((existing) => existing.id !== id) });
  },
}));
