// *********************
// Role of the component: Filters on shop page
// Name of the component: Filters.tsx
// Developer: perumal ponnusamy
// Version: 1.0
// Component call: <Filters />
// Input parameters: no input parameters
// Output: stock, rating and price filter
// *********************

"use client";
import React, { useEffect, useState, useTransition } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { useSortStore } from "@/app/_zustand/sortStore";
import { useShopMetaStore } from "@/app/_zustand/shopMetaStore";
import { useCategoryStore } from "@/app/_zustand/categoryStore";

interface InputCategory {
  inStock: { text: string; isChecked: boolean };
  priceFilter: { text: string; value: number };
  minPriceFilter: { text: string; value: number };
}

const DEFAULT_MAX_PRICE = 10000;

const Filters = () => {
  const pathname = usePathname();
  const { replace } = useRouter();
  const searchParams = useSearchParams();
  const { maxPrice } = useShopMetaStore();
  const [isPending, startTransition] = useTransition();

  // current page number from URL search params (default to 1)
  const pageParam = searchParams.get("page");
  const page = pageParam ? Number(pageParam) || 1 : 1;

  const [inputCategory, setInputCategory] = useState<InputCategory>(() => {
    const inStockParam = searchParams.get("inStock");
    const priceParam = searchParams.get("price");

    const minPriceParam = searchParams.get("minPrice");
    return {
      inStock: {
        text: "instock",
        isChecked: inStockParam ? inStockParam === "true" : true,
      },
      priceFilter: {
        text: "price",
        value: priceParam ? Number(priceParam) : DEFAULT_MAX_PRICE,
      },
      minPriceFilter: {
        text: "minPrice",
        value: minPriceParam ? Number(minPriceParam) : 0,
      },
    };
  });

  const [tempPrice, setTempPrice] = useState<number>(() => {
    const priceParam = searchParams.get("price");
    return priceParam ? Number(priceParam) : DEFAULT_MAX_PRICE;
  });
  const [tempMin, setTempMin] = useState<number>(() => {
    const minPriceParam = searchParams.get("minPrice");
    return minPriceParam ? Number(minPriceParam) : 0;
  });
  const [sliderMax, setSliderMax] = useState<number>(() => {
    const priceParam = searchParams.get("price");
    return Math.max(DEFAULT_MAX_PRICE, priceParam ? Number(priceParam) : 0);
  });
  const [minInput, setMinInput] = useState<string>(() => {
    const minPriceParam = searchParams.get("minPrice");
    return minPriceParam ? minPriceParam : "0";
  });
  const { categories, fetchCategories } = useCategoryStore();
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(() => {
    const cat = searchParams.getAll("categoryId");
    return cat.length > 0 ? cat : [];
  });
  const { sortBy, changeSortBy } = useSortStore();

  // Sync sortBy store from URL on mount so SortBy dropdown matches the URL
  useEffect(() => {
    const urlSort = searchParams.get("sort");
    if (urlSort && urlSort !== sortBy) changeSortBy(urlSort);
  }, []);

  // Trigger shared category fetch (no-op if already loaded)
  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  // When maxPrice arrives: always update the slider range for better UX.
  // Only update inputCategory (and trigger URL change) when no explicit price is in the URL.
  useEffect(() => {
    if (!maxPrice) return;
    setSliderMax(Math.max(DEFAULT_MAX_PRICE, maxPrice));
    const priceParam = searchParams.get("price");
    if (!priceParam && inputCategory.priceFilter.value === DEFAULT_MAX_PRICE) {
      setInputCategory((prev) => ({
        ...prev,
        priceFilter: { text: "price", value: maxPrice },
      }));
      setTempPrice(maxPrice);
      setMinInput("0");
    }
  }, [maxPrice]);

  useEffect(() => {
    // Build the new param values
    const newInStock  = inputCategory.inStock.isChecked.toString();
    const newMinPrice = inputCategory.minPriceFilter.value.toString();
    const newPrice    = inputCategory.priceFilter.value.toString();
    const newSort     = sortBy;
    const newPage     = page.toString();
    const newCats     = [...selectedCategories].sort().join(",");

    // Compare against current URL (treating missing params as their defaults)
    const curInStock  = searchParams.get("inStock")  ?? "true";
    const curMinPrice = searchParams.get("minPrice") ?? "0";
    const curPrice    = searchParams.get("price")    ?? String(DEFAULT_MAX_PRICE);
    const curSort     = searchParams.get("sort")     ?? "lowPrice";
    const curPage     = searchParams.get("page")     ?? "1";
    const curCats     = [...searchParams.getAll("categoryId")].sort().join(",");

    if (
      curInStock  === newInStock  &&
      curMinPrice === newMinPrice &&
      curPrice    === newPrice    &&
      curSort     === newSort     &&
      curPage     === newPage     &&
      curCats     === newCats
    ) return; // nothing changed — skip navigation

    const params = new URLSearchParams(searchParams.toString());
    params.set("inStock", newInStock);
    params.set("minPrice", newMinPrice);
    params.set("price", newPrice);
    params.set("sort", newSort);
    params.set("page", newPage);
    params.delete("categoryId");
    selectedCategories.forEach((id) => params.append("categoryId", id));
    startTransition(() => {
      replace(`${pathname}?${params.toString()}`);
    });
  }, [inputCategory, sortBy, page, selectedCategories]);

  return (
    <div className="rounded-2xl border border-gray-200 overflow-hidden">
      <div className="bg-blue-500 border-b border-blue-600 px-5 py-3">
        <h3 className="text-lg font-bold text-white uppercase tracking-wide">Filters</h3>
      </div>
      <div className="p-4 bg-white">
      <div className="border-t border-gray-100 pt-3 border-t-0 pt-0">
        <h4 className="text-lg font-semibold text-gray-500 uppercase tracking-wider mb-2">Availability</h4>
        <div className="form-control">
          <label className="cursor-pointer flex items-center gap-2">
            <input
              type="checkbox"
              checked={inputCategory.inStock.isChecked}
              onChange={() =>
                setInputCategory({
                  ...inputCategory,
                  inStock: {
                    text: "instock",
                    isChecked: !inputCategory.inStock.isChecked,
                  },
                })
              }
              className="w-5 h-5 rounded border-gray-300 text-blue-600 cursor-pointer"
            />
            <span className="text-xl text-gray-700">In stock</span>
          </label>
        </div>
      </div>

      {categories.length > 0 && (
        <>
          <div className="border-t border-gray-100 mt-3 pt-3">
            <h4 className="text-lg font-semibold text-gray-500 uppercase tracking-wider mb-2">Categories</h4>
            <div className="flex flex-col gap-1">
            {(showAllCategories ? categories : categories.slice(0, 5)).map((cat) => {
              const label = cat.title.replace(/%20/g, " ");
              const catId = String(cat.id);
              const isChecked = selectedCategories.includes(catId);
              return (
                <div key={cat.id} className="form-control">
                  <label className="cursor-pointer flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        setSelectedCategories((prev) =>
                          isChecked
                            ? prev.filter((c) => c !== catId)
                            : [...prev, catId]
                        );
                      }}
                      className="w-5 h-5 rounded border-gray-300 text-blue-600 cursor-pointer"
                    />
                    <span className="text-xl text-gray-700 truncate">{label}</span>
                  </label>
                </div>
              );
            })}
            {categories.length > 5 && (
              <button
                onClick={() => setShowAllCategories((prev) => !prev)}
                className="text-sm text-blue-500 hover:underline text-left mt-1"
              >
                {showAllCategories ? "Show less" : `+${categories.length - 5} more`}
              </button>
            )}
            {selectedCategories.length > 0 && (
              <button
                onClick={() => setSelectedCategories([])}
                className="text-sm text-red-400 hover:underline text-left mt-1"
              >
                Clear categories
              </button>
            )}
            </div>
          </div>
        </>
      )}

      <div className="border-t border-gray-100 mt-3 pt-3">
        <h4 className="text-lg font-semibold text-gray-500 uppercase tracking-wider mb-3">Price Range</h4>
        <div className="pt-2 relative">
          {/* Dual range slider track */}
          <div className="relative w-full h-2 mb-1" style={{ marginTop: "8px" }}>
            {/* Left unselected track (0 → min) */}
            <div
              className="absolute h-2 bg-gray-200 rounded-l"
              style={{
                left: "0%",
                width: `${(tempMin / sliderMax) * 100}%`,
              }}
            />
            {/* Selected track (min → max) */}
            <div
              className="absolute h-2 bg-blue-400"
              style={{
                left: `${(tempMin / sliderMax) * 100}%`,
                width: `${((tempPrice - tempMin) / sliderMax) * 100}%`,
              }}
            />
            {/* Right unselected track (max → end) */}
            <div
              className="absolute h-2 bg-gray-200 rounded-r"
              style={{
                left: `${(tempPrice / sliderMax) * 100}%`,
                right: "0%",
              }}
            />

            {/* Min thumb bubble removed — value shown in input box */}
            {/* Max thumb bubble removed — value shown in input box */}

            {/* Min range input */}
            <input
              type="range"
              min={0}
              max={sliderMax}
              step={10}
              value={tempMin}
              className="dual-range absolute w-full bg-transparent pointer-events-none"
              style={{
                height: "18px",
                top: "-8px",
                zIndex: tempMin >= tempPrice - 10 ? 5 : 3,
              }}
              onChange={(e) => {
                const val = Math.min(Number(e.target.value), tempPrice - 10);
                setTempMin(val);
                setMinInput(String(val));
              }}
              onMouseUp={() =>
                setInputCategory({
                  ...inputCategory,
                  minPriceFilter: { text: "minPrice", value: tempMin },
                })
              }
              onTouchEnd={() =>
                setInputCategory({
                  ...inputCategory,
                  minPriceFilter: { text: "minPrice", value: tempMin },
                })
              }
            />
            {/* Max range input */}
            <input
              type="range"
              min={0}
              max={sliderMax}
              step={10}
              value={tempPrice}
              className="dual-range absolute w-full bg-transparent pointer-events-none"
              style={{
                height: "18px",
                top: "-8px",
                zIndex: 4,
              }}
              onChange={(e) => {
                const val = Math.max(Number(e.target.value), tempMin + 10);
                setTempPrice(val);
                if (val >= sliderMax) {
                  setSliderMax((prev) => prev + 500);
                }
              }}
              onMouseUp={() =>
                setInputCategory({
                  ...inputCategory,
                  priceFilter: { text: "price", value: tempPrice },
                })
              }
              onTouchEnd={() =>
                setInputCategory({
                  ...inputCategory,
                  priceFilter: { text: "price", value: tempPrice },
                })
              }
            />
          </div>
          {/* Min / Max labels below slider */}
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>₹0</span>
            <span>₹{sliderMax}</span>
          </div>
          {/* Min / Max input boxes */}
          <div className="flex items-center gap-x-2 mt-3">
            <div className="flex flex-col flex-1">
              <label className="text-xs text-gray-500 mb-1">Min (₹)</label>
              <input
                type="number"
                min={0}
                value={minInput}
                onChange={(e) => {
                  setMinInput(e.target.value);
                  const val = Number(e.target.value);
                  if (!isNaN(val) && val >= 0 && val < tempPrice) {
                    setTempMin(val);
                  }
                }}
                onBlur={() => {
                  const val = Math.max(0, Math.min(Number(minInput), tempPrice - 10));
                  setTempMin(val);
                  setMinInput(String(val));
                  setInputCategory({
                    ...inputCategory,
                    minPriceFilter: { text: "minPrice", value: val },
                  });
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const val = Math.max(0, Math.min(Number(minInput), tempPrice - 10));
                    setTempMin(val);
                    setMinInput(String(val));
                    setInputCategory({
                      ...inputCategory,
                      minPriceFilter: { text: "minPrice", value: val },
                    });
                  }
                }}
                className={`border rounded px-2 py-1 w-full text-sm focus:outline-none ${
                  Number(minInput) >= tempPrice
                    ? "border-red-500 focus:border-red-500"
                    : "border-gray-400 focus:border-blue-500"
                }`}
              />
            </div>
            <span className="text-gray-400 mt-4">—</span>
            <div className="flex flex-col flex-1">
              <label className="text-xs text-gray-500 mb-1">Max (₹)</label>
              <input
                type="number"
                min={0}
                value={tempPrice}
                onChange={(e) => {
                  const val = Math.max(0, Number(e.target.value));
                  setTempPrice(val);
                }}
                onBlur={() => {
                  const val = Math.max(tempMin + 10, tempPrice);
                  setTempPrice(val);
                  setInputCategory({
                    ...inputCategory,
                    priceFilter: { text: "price", value: val },
                  });
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const val = Math.max(tempMin + 10, tempPrice);
                    setTempPrice(val);
                    setInputCategory({
                      ...inputCategory,
                      priceFilter: { text: "price", value: val },
                    });
                  }
                }}
                className={`border rounded px-2 py-1 w-full text-sm focus:outline-none ${
                  tempPrice <= tempMin
                    ? "border-red-500 focus:border-red-500"
                    : "border-gray-400 focus:border-blue-500"
                }`}
              />
            </div>
          </div>
        </div>
      </div>

      </div>
    </div>
  );
};

export default Filters;
