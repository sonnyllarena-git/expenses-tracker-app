import { create } from 'zustand';

import { insertExpense, listExpenses, type NewExpenseInput } from '@/db/queries/expenses';
import type { Expense } from '@/types';

interface ExpenseState {
  expenses: Expense[];
  isLoading: boolean;
  load: (userId: string) => Promise<void>;
  addExpense: (input: NewExpenseInput) => Promise<Expense>;
}

export const useExpenseStore = create<ExpenseState>((set, get) => ({
  expenses: [],
  isLoading: false,
  load: async (userId: string) => {
    set({ isLoading: true });
    const expenses = await listExpenses(userId);
    set({ expenses, isLoading: false });
  },
  addExpense: async (input: NewExpenseInput) => {
    const expense = await insertExpense(input);
    set({ expenses: [expense, ...get().expenses] });
    return expense;
  },
}));
