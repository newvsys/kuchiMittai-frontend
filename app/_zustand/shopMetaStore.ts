import { create } from "zustand";

export type ShopMetaState = {
  maxPrice: number | null;
};

export type ShopMetaActions = {
  setMaxPrice: (value: number | null) => void;
};

export const useShopMetaStore = create<ShopMetaState & ShopMetaActions>((set) => ({
  maxPrice: null,
  setMaxPrice: (value: number | null) => set({ maxPrice: value }),
}));
