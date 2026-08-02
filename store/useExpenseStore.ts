import { create } from 'zustand';

import {
  deleteExpense,
  insertExpense,
  listExpenses,
  updateExpense,
  type NewExpenseInput,
  type UpdateExpenseInput,
} from '@/db/queries/expenses';
import type { Expense } from '@/types';

interface ExpenseState {
  expenses: Expense[];
  isLoading: boolean;
  load: (userId: string) => Promise<void>;
  addExpense: (input: NewExpenseInput) => Promise<Expense>;
  editExpense: (id: string, input: UpdateExpenseInput) => Promise<Expense>;
  removeExpense: (id: string) => Promise<void>;
}

export const useExpenseStore = create<ExpenseState>((set, get) => ({
  expenses: [],
  isLoading: false,
  load: async (userId: string) => {
    set({ isLoading: true });
    try {
      const expenses = await listExpenses(userId);
      set({ expenses });
    } finally {
      set({ isLoading: false });
    }
  },
  addExpense: async (input: NewExpenseInput) => {
    const expense = await insertExpense(input);
    set({ expenses: [expense, ...get().expenses] });
    return expense;
  },
  editExpense: async (id: string, input: UpdateExpenseInput) => {
    const expense = await updateExpense(id, input);
    set({ expenses: get().expenses.map((existing) => (existing.id === id ? expense : existing)) });
    return expense;
  },
  removeExpense: async (id: string) => {
    await deleteExpense(id);
    set({ expenses: get().expenses.filter((existing) => existing.id !== id) });
  },
}));
