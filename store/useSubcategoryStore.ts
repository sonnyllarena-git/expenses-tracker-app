import { create } from 'zustand';

import {
  insertCustomSubcategory,
  listSubcategoriesByCategoryIds,
  seedDefaultSubcategories,
} from '@/db/queries/subcategories';
import type { Category, Subcategory } from '@/types';

interface SubcategoryState {
  subcategories: Subcategory[];
  isLoading: boolean;
  /** Loads subcategories for the given categories, seeding the defaults for any missing. */
  load: (categories: Category[]) => Promise<void>;
  addCustomSubcategory: (categoryId: string, name: string) => Promise<Subcategory>;
}

export const useSubcategoryStore = create<SubcategoryState>((set, get) => ({
  subcategories: [],
  isLoading: false,
  load: async (categories: Category[]) => {
    set({ isLoading: true });
    try {
      await seedDefaultSubcategories(categories);
      const subcategories = await listSubcategoriesByCategoryIds(categories.map((c) => c.id));
      set({ subcategories });
    } finally {
      set({ isLoading: false });
    }
  },
  addCustomSubcategory: async (categoryId: string, name: string) => {
    const subcategory = await insertCustomSubcategory({ categoryId, name });
    set({ subcategories: [...get().subcategories, subcategory] });
    return subcategory;
  },
}));
