import Filters from "@/components/Filters";
import ProductItem from "@/components/ProductItem";
import SortBy from "@/components/SortBy";
import SearchMaxPriceInitializer from "@/components/SearchMaxPriceInitializer";
import SearchPagination from "@/components/SearchPagination";
import ProductAdvertisementFlashBar from "@/components/ProductAdvertisementFlashBar";
import { sanitize } from "@/lib/sanitize";
import { API_BASE } from "@/lib/env";

type SearchParams = { [key: string]: string | string[] | undefined };

export default async function SearchResultsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams> | SearchParams;
}) {
  const params = await searchParams;
  let products: any[] = [];
  let maxPrice: number | null = null;
  let totalPages = 1;
  const initialCategoryIds = Array.isArray(params.categoryId)
    ? params.categoryId
    : params.categoryId
      ? [params.categoryId]
      : [];
  const showPromoBar =
    !params.search &&
    (!params.inStock || params.inStock === "false") &&
    (!params.minPrice || params.minPrice === "0") &&
    (!params.price || params.price === "10000") &&
    (!params.sort || params.sort === "defaultSort") &&
    (!params.page || params.page === "1") &&
    (initialCategoryIds.length === 0 ||
      (initialCategoryIds.length === 1 && initialCategoryIds[0] === "0"));

  try {
    const search = typeof params.search === "string" ? params.search : "";
    const inStock = typeof params.inStock === "string" ? params.inStock : "true";
    const minPrice = typeof params.minPrice === "string" ? params.minPrice : "0";
    const price = typeof params.price === "string" ? params.price : "10000";
    const sort = typeof params.sort === "string" ? params.sort : "defaultSort";
    const page = typeof params.page === "string" ? params.page : "1";
    const categoryIds = Array.isArray(params.categoryId)
      ? params.categoryId
      : params.categoryId
        ? [params.categoryId]
        : [];
    const queryString =
      `query=${encodeURIComponent(search)}` +
      `&inStock=${encodeURIComponent(inStock)}` +
      `&minPrice=${encodeURIComponent(minPrice)}` +
      `&price=${encodeURIComponent(price)}` +
      `&sort=${encodeURIComponent(sort)}` +
      `&page=${encodeURIComponent(page)}` +
      "&limit=12" +
      categoryIds.map((id) => `&categoryId=${encodeURIComponent(id)}`).join("");

    if (!API_BASE) throw new Error("API_BASE is empty. Check API_BASE_URL environment variable");

    const response = await fetch(`${API_BASE}/products/search?${queryString}`, { cache: "no-store" });
    if (!response.ok) {
      console.error("[CATALOG] Product request failed:", response.status, response.statusText);
    } else {
      const result = await response.json();
      if (Array.isArray(result)) {
        products = result;
      } else if (result && Array.isArray(result.items)) {
        products = result.items;
        totalPages = typeof result.totalPages === "number" && result.totalPages > 0
          ? result.totalPages
          : 1;
      }

      products = products.filter((product: any) => product?.slug && product?.title && product?.price);
      if (products.length > 0) {
        maxPrice = products.reduce((max: number, product: any) => {
          const productPrice = typeof product.price === "number" ? product.price : 0;
          return Math.max(max, productPrice);
        }, 0);
      }
    }
  } catch (error: any) {
    console.error("[CATALOG] Product request error:", error?.message || error);
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="w-full px-4 pb-6 pt-0 sm:px-6 lg:px-10">
        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-x-4 gap-y-0">
          <SearchMaxPriceInitializer maxPrice={maxPrice} />
          {showPromoBar && (
            <div className="mb-2 md:col-span-2">
              <ProductAdvertisementFlashBar />
            </div>
          )}
          <aside className={`self-start md:sticky md:top-[var(--search-sticky-top)] ${showPromoBar ? "md:row-start-2" : ""}`}>
            <Filters />
          </aside>
          <div className={`overflow-hidden rounded-2xl border border-gray-200 md:overflow-visible ${showPromoBar ? "md:col-start-2 md:row-start-2" : ""}`}>
            <div className="sticky top-0 z-40 shrink-0 rounded-t-2xl border-b border-gray-200 bg-gray-100 px-6 py-3 shadow-sm md:top-[var(--search-sticky-top)] flex justify-between items-center gap-3 max-lg:flex-col max-lg:items-start">
              <div>
                <h1 className="text-base font-bold text-gray-900">
                  {params.search ? `Results for "${sanitize(params.search as string)}"` : "All Products"}
                </h1>
                {products.length > 0 && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {products.length} product{products.length !== 1 ? "s" : ""} found
                  </p>
                )}
              </div>
              <SortBy />
            </div>
            <div className="min-h-0 p-4 bg-white">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-stretch">
                {products.length > 0 ? (
                  products.map((product: any) => (
                    <ProductItem
                      key={product.id}
                      product={product}
                      color="black"
                      avgRating={product.averageRating}
                      totalReviews={product.totalReviews}
                      ratingDistribution={product.ratingDistribution}
                    />
                  ))
                ) : (
                  <div className="col-span-full flex flex-col items-center justify-center py-24 text-center">
                    <h3 className="text-lg font-semibold text-gray-700">No products found</h3>
                    <p className="text-sm text-gray-500 mt-1">Try adjusting your search or filter criteria</p>
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
}