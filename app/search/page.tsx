import Filters from "@/components/Filters";
import ProductItem from "@/components/ProductItem";
import SortBy from "@/components/SortBy";
import SearchMaxPriceInitializer from "@/components/SearchMaxPriceInitializer";
import SearchPagination from "@/components/SearchPagination";
import React from "react";
import { sanitize } from "@/lib/sanitize";
import { API_BASE } from "@/lib/env";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

interface RatingSummary {
  avgRating: number;
  totalReviews: number;
  distribution: Record<string, number>;
}

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
      `&limit=12` +
      categoryIds
        .map((id) => `&categoryId=${encodeURIComponent(id)}`)
        .join("");

    if (!API_BASE) {
      throw new Error("API_BASE is empty. Check API_BASE_URL environment variable");
    }

    console.log("[SEARCH] API_BASE:", API_BASE);

    const url = `${API_BASE}/products/search?${queryString}`;

    console.log("[SEARCH] Calling:", url);

    const res = await fetch(url, {
      cache: "no-store",
    });

    console.log("[SEARCH] Response:", res.status);

    if (!res.ok) {
      console.error(
        "[SEARCH] Failed:",
        res.status,
        res.statusText
      );
      products = [];
    } else {
      const result = await res.json();

      if (Array.isArray(result)) {
        products = result;
        totalPages = 1;
      } else if (result && Array.isArray(result.items)) {
        products = result.items;

        totalPages =
          typeof result.totalPages === "number" &&
          result.totalPages > 0
            ? result.totalPages
            : 1;
      } else {
        products = [];
        totalPages = 1;
      }

      if (products.length > 0) {
        products = products.filter(
          (p: any) =>
            p?.slug &&
            p?.title &&
            p?.price
        );

        maxPrice = products.reduce(
          (max: number, p: any) => {
            const productPrice =
              typeof p.price === "number"
                ? p.price
                : 0;

            return productPrice > max
              ? productPrice
              : max;
          },
          0
        );
      }
    }

  } catch (error: any) {
    console.error("[SEARCH] Error:", error);
    console.error("[SEARCH] Cause:", error?.cause);
    products = [];
  }


  /*
    Fetch ratings
    API_BASE already contains /api
    Example:
    http://app:8080/api/reviews/product/1
  */

  if (products.length > 0) {

    const productsWithId = products.filter(
      (p: any) => p?.id != null
    );

    const reviewIdMap = new Map<
      number | string,
      number | string
    >();

    productsWithId.forEach((p: any) => {
      reviewIdMap.set(
        p.id,
        p.productId ??
        p.baseProductId ??
        p.id
      );
    });


    const uniqueReviewIds = [
      ...new Set(reviewIdMap.values())
    ];


    const summaries = await Promise.allSettled(

      uniqueReviewIds.map((reviewId) => {

        const url =
          `${API_BASE}/reviews/product/${reviewId}`;

        console.log("[REVIEW] Calling:", url);

        return fetch(url, {
          cache: "no-store",
        })
          .then((r) =>
            r.ok ? r.json() : null
          )
          .catch(() => null);
      })
    );


    const reviewDataMap =
      new Map<number | string, RatingSummary>();


    uniqueReviewIds.forEach((reviewId, i) => {

      const result = summaries[i];

      if (
        result.status === "fulfilled" &&
        result.value
      ) {

        const {
          averageRating,
          totalReviews,
          ratingDistribution,
        } = result.value;


        if (
          typeof averageRating === "number" &&
          typeof totalReviews === "number" &&
          totalReviews > 0
        ) {

          reviewDataMap.set(
            reviewId,
            {
              avgRating: averageRating,
              totalReviews,
              distribution:
                ratingDistribution ?? {},
            }
          );

        }
      }

    });


    productsWithId.forEach((p: any) => {

      const reviewId =
        reviewIdMap.get(p.id);

      if (
        reviewId !== undefined &&
        reviewDataMap.has(reviewId)
      ) {

        ratingMap[p.id] =
          reviewDataMap.get(reviewId)!;

      }

    });

  }


  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="w-full px-4 sm:px-6 lg:px-10 py-6">

        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4">

          <>
            <SearchMaxPriceInitializer
              maxPrice={maxPrice}
            />

            <aside className="sticky top-4 self-start">
              <Filters />
            </aside>
          </>


          <div className="rounded-2xl border border-gray-200 overflow-hidden">

            <div className="bg-gray-100 border-b border-gray-200 px-6 py-3 flex justify-between items-center gap-3 max-lg:flex-col max-lg:items-start">

              <div>
                <h1 className="text-base font-bold text-gray-900">
                  {sp?.search
                    ? `Results for "${sanitize(
                        sp.search as string
                      )}"`
                    : "All Products"}
                </h1>

                {products.length > 0 && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {products.length} product
                    {products.length !== 1 ? "s" : ""} found
                  </p>
                )}

              </div>

              <SortBy />

            </div>


            <div className="p-4 bg-white">

              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-stretch">

                {products.length > 0 ? (

                  products.map((product: any) => (

                    <ProductItem
                      key={product.id}
                      product={product}
                      color="black"
                      avgRating={
                        ratingMap[product.id]?.avgRating
                      }
                      totalReviews={
                        ratingMap[product.id]?.totalReviews
                      }
                      ratingDistribution={
                        ratingMap[product.id]?.distribution
                      }
                    />

                  ))

                ) : (

                  <div className="col-span-full flex flex-col items-center justify-center py-24 text-center">

                    <h3 className="text-lg font-semibold text-gray-700">
                      No products found
                    </h3>

                    <p className="text-sm text-gray-500 mt-1">
                      Try adjusting your search or filter criteria
                    </p>

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