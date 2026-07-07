"use client";

import { useEffect } from "react";
import { useShopMetaStore } from "@/app/_zustand/shopMetaStore";

interface Props {
  maxPrice: number | null;
}

const SearchMaxPriceInitializer = ({ maxPrice }: Props) => {
  const { setMaxPrice } = useShopMetaStore();

  useEffect(() => {
    setMaxPrice(maxPrice ?? null);
  }, [maxPrice, setMaxPrice]);

  return null;
};

export default SearchMaxPriceInitializer;
