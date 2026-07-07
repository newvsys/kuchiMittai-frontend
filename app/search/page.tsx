import Filters from "@/components/Filters";
import ProductItem from "@/components/ProductItem";
import SortBy from "@/components/SortBy";
import SearchMaxPriceInitializer from "@/components/SearchMaxPriceInitializer";
import SearchPagination from "@/components/SearchPagination";
import React from "react";
import { sanitize } from "@/lib/sanitize";
import { API_BASE } from "@/lib/env";

interface Props {
  searchParams: { [key: string]: string | string[] | undefined };
}

interface RatingSummary {
  avgRating: number;
  totalReviews: number;
  distribution: Record<string, number>;
}

// sending api request for search results for a given search text, with filters
const SearchPage = async ({ searchParams }: Props) => {
  const sp = await searchParams;
  let products: any[] = [];
  let maxPrice: number | null = null;
  let totalPages = 1;
  let ratingMap: Record<string | number, RatingSummary> = {};

  try {
    const search = typeof sp?.search === "string" ? sp.search : "";
    const inStock = typeof sp?.inStock === "string" ? sp.inStock : "true";
    const minPrice = typeof sp?.minPrice === "string" ? sp.minPrice : "0";
    const price = typeof sp?.price === "string" ? sp.price : "10000";
    const sort = typeof sp?.sort === "string" ? sp.sort : "lowPrice";
    const page = typeof sp?.page === "string" ? sp.page : "1";
    const categoryIds = Array.isArray(sp?.categoryId)
      ? sp.categoryId
      : sp?.categoryId
      ? [sp.categoryId]
      : [];

    const queryString =
      `query=${encodeURIComponent(search)}` +
      `&inStock=${encodeURIComponent(inStock)}` +
      `&minPrice=${encodeURIComponent(minPrice)}` +
      `&price=${encodeURIComponent(price)}` +
      `&sort=${encodeURIComponent(sort)}` +
      `&page=${encodeURIComponent(page)}` +
      `&limit=${encodeURIComponent("12")}` +
      categoryIds.map((id) => `&categoryId=${encodeURIComponent(id)}`).join("");

    const API_BASE_URL = API_BASE;
    const url = `${API_BASE_URL}/api/products/search?${queryString}`;
    const res = await fetch(url, { next: { revalidate: 60 } });
   
    if (!res.ok) {
      console.error("Failed to fetch search results:", res.statusText);
      products = [];
    } else {
      const result = await res.json();
      if (Array.isArray(result)) {
        // No metadata: treat as a single page
        products = result;
        totalPages = 1;
      } else if (result && Array.isArray(result.items)) {
        // Paged response with metadata: { items, totalPages }
        products = result.items;
        if (typeof result.totalPages === "number" && result.totalPages > 0) {
          totalPages = result.totalPages;
        } else {
          totalPages = 1;
        }
      } else {
        products = [];
        totalPages = 1;
      }

      if (products.length > 0) {
        products = products.filter((p: any) => p?.slug && p?.title && p?.price);
        maxPrice = products.reduce((max: number, p: any) => {
          const price = typeof p.price === "number" ? p.price : 0;
          return price > max ? price : max;
        }, 0);
      } else {
        maxPrice = null;
      }
    }
  } catch (error) {
    console.error("Error fetching search results:", error);
    products = [];
  }

  // Fetch rating summaries for all products in parallel
  // Use same server-side API_BASE_URL (Docker-internal) as the products fetch
  if (products.length > 0) {
    const REVIEW_API_BASE = API_BASE;

    // Deduplicate by reviewId — variants of the same product share the same base review
    const productsWithId = products.filter((p: any) => p?.id != null);
    const reviewIdMap = new Map<number | string, number | string>();
    productsWithId.forEach((p: any) => {
      reviewIdMap.set(p.id, p.productId ?? p.baseProductId ?? p.id);
    });
    const uniqueReviewIds = [...new Set(reviewIdMap.values())];

    const summaries = await Promise.allSettled(
      uniqueReviewIds.map((reviewId) => {
        const url = `${REVIEW_API_BASE}/api/reviews/product/${reviewId}`;
        return fetch(url, { next: { revalidate: 300 } })
          .then((r) => r.ok ? r.json() : null)
          .catch(() => null);
      })
    );

    // Build reviewId → summary map
    const reviewDataMap = new Map<number | string, RatingSummary>();
    uniqueReviewIds.forEach((reviewId, i) => {
      const result = summaries[i];
      if (result.status === "fulfilled" && result.value) {
        const { averageRating, totalReviews, ratingDistribution } = result.value;
        if (typeof averageRating === "number" && typeof totalReviews === "number" && totalReviews > 0) {
          reviewDataMap.set(reviewId, {
            avgRating: averageRating,
            totalReviews,
            distribution: ratingDistribution ?? {},
          });
        }
      }
    });

    // Map back to product.id
    productsWithId.forEach((p: any) => {
      const reviewId = reviewIdMap.get(p.id);
      if (reviewId !== undefined && reviewDataMap.has(reviewId)) {
        ratingMap[p.id] = reviewDataMap.get(reviewId)!;
      }
    });
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="w-full px-6 max-sm:px-4 py-8">
        <div className="grid grid-cols-[380px_1fr] gap-6 max-md:grid-cols-1">
          <>
            <SearchMaxPriceInitializer maxPrice={maxPrice} />
            <aside className="sticky top-4 self-start">
              <Filters />
            </aside>
          </>
          <div className="rounded-2xl border border-gray-200 overflow-hidden">
            <div className="bg-gray-100 border-b border-gray-200 px-6 py-3 flex justify-between items-center gap-3 max-lg:flex-col max-lg:items-start">
              <div>
                <h1 className="text-base font-bold text-gray-900">
                  {sp?.search
                    ? `Results for "${sanitize(sp?.search as string)}"`
                    : "All Products"}
                </h1>
                {products.length > 0 && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {products.length} product{products.length !== 1 ? "s" : ""} found
                  </p>
                )}
              </div>
              <SortBy />
            </div>
            <div className="p-4 bg-white">
            <div className="grid grid-cols-4 gap-4 items-stretch max-lg:grid-cols-3 max-md:grid-cols-2 max-[500px]:grid-cols-1">
              {products.length > 0 ? (
                products.map((product: any) => (
                  <ProductItem
                    key={product.id}
                    product={product}
                    color="black"
                    avgRating={ratingMap[product.id]?.avgRating}
                    totalReviews={ratingMap[product.id]?.totalReviews}
                    ratingDistribution={ratingMap[product.id]?.distribution}
                  />
                ))
              ) : (
                <div className="col-span-full flex flex-col items-center justify-center py-24 text-center">
                  <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700">No products found</h3>
                  <p className="text-sm text-gray-500 mt-1 max-w-xs">Try adjusting your search or filter criteria</p>
                </div>
              )}
            </div>
            <SearchPagination totalPages={totalPages} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchPage;

/*

*/
