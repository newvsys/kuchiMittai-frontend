import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { API_BASE } from "@/lib/env";

export interface Category {
  id: number;
  title: string;
  [key: string]: any;
}

interface CategoryState {
  categories: Category[];
  loading: boolean;
  error: string | null;
  fetched: boolean;
  fetchCategories: () => Promise<void>;
  initCategories: (cats: Category[]) => void;
}

export const useCategoryStore = create<CategoryState>()(
  persist(
    (set, get) => ({
      categories: [],
      loading: false,
      error: null,
      fetched: false,

      fetchCategories: async () => {
        // Skip if already fetched (including from sessionStorage) or currently loading
        if (get().fetched || get().loading) return;

        set({ loading: true, error: null });
        try {
          const res = await fetch(`${API_BASE}/api/products/categories`);
          if (!res.ok) throw new Error("Failed to fetch categories");
          const data: Category[] = await res.json();
          set({ categories: Array.isArray(data) ? data : [], fetched: true });
        } catch (err: any) {
          set({ error: err.message || "Unknown error" });
        } finally {
          set({ loading: false });
        }
      },

      initCategories: (cats: Category[]) => {
        if (get().fetched || cats.length === 0) return;
        set({ categories: cats, fetched: true });
      },
    }),
    {
      name: "category-store",
      storage: createJSONStorage(() => sessionStorage),
      // Only persist the data, not transient loading/error state
      partialize: (state) => ({
        categories: state.categories,
        fetched: state.fetched,
      }),
    }
  )
);
