import { create } from 'zustand';

import {
  createRecurringTemplate,
  deleteRecurringTemplate,
  listRecurringTemplates,
  materializeRecurring,
  updateRecurringTemplate,
  type NewRecurringInput,
  type UpdateRecurringInput,
} from '@/db/queries/recurring';
import type { Expense } from '@/types';
import { today } from '@/utils/date';

interface RecurringState {
  templates: Expense[];
  isLoading: boolean;
  load: (userId: string) => Promise<void>;
  create: (input: NewRecurringInput) => Promise<Expense>;
  update: (id: string, input: UpdateRecurringInput) => Promise<Expense>;
  remove: (id: string) => Promise<void>;
  /** Materializes any due occurrences for `userId`, returning the count created. */
  materialize: (userId: string) => Promise<number>;
}

export const useRecurringStore = create<RecurringState>((set, get) => ({
  templates: [],
  isLoading: false,
  load: async (userId: string) => {
    set({ isLoading: true });
    try {
      const templates = await listRecurringTemplates(userId);
      set({ templates });
    } finally {
      set({ isLoading: false });
    }
  },
  create: async (input: NewRecurringInput) => {
    const template = await createRecurringTemplate(input);
    set({ templates: [template, ...get().templates] });
    return template;
  },
  update: async (id: string, input: UpdateRecurringInput) => {
    const template = await updateRecurringTemplate(id, input);
    set({
      templates: get().templates.map((existing) => (existing.id === id ? template : existing)),
    });
    return template;
  },
  remove: async (id: string) => {
    await deleteRecurringTemplate(id);
    set({ templates: get().templates.filter((existing) => existing.id !== id) });
  },
  materialize: async (userId: string) => {
    return materializeRecurring(userId, today());
  },
}));
