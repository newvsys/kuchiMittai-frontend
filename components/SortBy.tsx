// *********************
// Role of the component: SortBy
// Name of the component: SortBy.tsx
// Developer: perumal ponnusamy
// Version: 1.0
// Component call: <SortBy />
// Input parameters: no input parameters
// Output: select input with options for sorting by a-z, z-a, price low, price high
// *********************

"use client";
import React from "react";
import { useSortStore } from "@/app/_zustand/sortStore";

const SortBy = () => {
  // getting values from Zustand sort store
  const { sortBy, changeSortBy } = useSortStore();

  return (
    <div className="flex items-center gap-3 max-lg:w-full">
      <span className="text-sm font-medium text-gray-600 whitespace-nowrap">Sort by</span>
      <div className="relative max-lg:flex-1">
        <select
          value={sortBy}
          onChange={(e) => changeSortBy(e.target.value)}
          className="appearance-none w-full border border-gray-200 rounded-lg py-2 pl-3 pr-8 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm text-gray-700"
          style={{ backgroundImage: "none" }}
          name="sort"
        >
          <option value="lowPrice">Price: Low to High</option>
          <option value="highPrice">Price: High to Low</option>
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-gray-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </div>
    </div>
  );
};

export default SortBy;
