import { create } from 'zustand';

import { listCategories, seedDefaultCategories } from '@/db/queries/categories';
import type { Category } from '@/types';

interface CategoryState {
  categories: Category[];
  isLoading: boolean;
  /** Loads categories for the account, seeding the 7 defaults on first launch. */
  load: (userId: string) => Promise<void>;
}

export const useCategoryStore = create<CategoryState>((set) => ({
  categories: [],
  isLoading: false,
  load: async (userId: string) => {
    set({ isLoading: true });
    await seedDefaultCategories(userId);
    const categories = await listCategories(userId);
    set({ categories, isLoading: false });
  },
}));
