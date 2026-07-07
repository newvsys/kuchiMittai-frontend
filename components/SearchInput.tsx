// *********************
// Role of the component: Search input element located in the header but it can be used anywhere in your application
// Name of the component: SearchInput.tsx
// Developer: perumal ponnusamy
// Version: 1.0
// Component call: <SearchInput />
// Input parameters: no input parameters
// Output: form with search input and button
// *********************

"use client";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import { sanitize } from "@/lib/sanitize";

const SearchInput = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Pre-populate with current search query from URL (decoded)
  const urlSearch = searchParams.get("search") ?? "";
  const [searchInput, setSearchInput] = useState<string>(() =>
    decodeURIComponent(urlSearch)
  );

  // Keep the input in sync whenever the URL changes (filter changes, back/forward, direct URL)
  useEffect(() => {
    setSearchInput(decodeURIComponent(searchParams.get("search") ?? ""));
  }, [searchParams]);

  // function for modifying URL for searching products
  const searchProducts = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const sanitizedSearch = sanitize(searchInput);

    // Preserve existing filter params, but reset to page 1 with new search
    const params = new URLSearchParams(searchParams.toString());
    params.set("search", encodeURIComponent(sanitizedSearch));
    params.set("page", "1");
    // Ensure all filter defaults are present so Filters.tsx doesn't need to add them
    if (!params.has("inStock"))  params.set("inStock",  "true");
    if (!params.has("minPrice")) params.set("minPrice", "0");
    if (!params.has("price"))    params.set("price",    "10000");
    if (!params.has("sort"))     params.set("sort",     "lowPrice");

    router.push(`/search?${params.toString()}`);
  };

  return (
    <form className="flex w-full justify-center" onSubmit={searchProducts}>
      <input
        type="text"
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        placeholder="Type here"
        className="bg-gray-50 input input-bordered w-[70%] rounded-r-none outline-none focus:outline-none max-sm:w-full"
      />
      <button type="submit" className="btn bg-blue-500 text-white rounded-l-none rounded-r-xl hover:bg-blue-600">
        Search
      </button>
    </form>
  );
};

export default SearchInput;
