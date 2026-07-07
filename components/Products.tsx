// *********************
// Role of the component: Showing products on the shop page with applied filter and sort
// Name of the component: Products.tsx
// Developer: perumal ponnusamy
// Version: 1.0
// Component call: <Products params={params} searchParams={searchParams} />
// Input parameters: { params, searchParams }: { params: { slug?: string[] }, searchParams: { [key: string]: string | string[] | undefined } }
// Output: products grid
// *********************

// ...existing code...

"use client";

import React, { useEffect, useState } from "react";
import ProductItem from "./ProductItem";
import SearchPagination from "./SearchPagination";
import apiClient from "@/lib/api";
import { useShopMetaStore } from "@/app/_zustand/shopMetaStore";
import { API_BASE } from "@/lib/env";

const Products = ({ params, searchParams }: { params: { slug?: string[] }, searchParams: { [key: string]: string | string[] | undefined } }) => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState<number>(1);
  const { setMaxPrice } = useShopMetaStore();

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        const API_BASE_URL = API_BASE;
        const category = params?.slug?.[0] || "all";
        const query = `outOfStock=${searchParams?.outOfStock || false}` +
          `&inStock=${searchParams?.inStock || false}` +
          `&rating=${searchParams?.rating || 0}` +
          `&minPrice=${searchParams?.minPrice || 0}` +
          `&price=${searchParams?.price || 10000}` +
          `&sort=${searchParams?.sort || "lowPrice"}` +
          `&page=${searchParams?.page || 1}` +
          (searchParams?.categoryId
            ? (Array.isArray(searchParams.categoryId)
                ? searchParams.categoryId
                : [searchParams.categoryId]
              ).map((id: string) => `&categoryId=${encodeURIComponent(id)}`).join("")
            : "");
        const url = `${API_BASE_URL}/api/products/shop/${category}?${query}`;
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error("Failed to fetch products");
        }
        const result = await res.json();

        let items: any[] = [];
        let pages = 1;

        if (Array.isArray(result)) {
          // Simple array response: treat as a single page
          items = result;
          pages = 1;
        } else if (result && Array.isArray(result.items)) {
          // Paged response with metadata: { items, totalPages }
          items = result.items;
          if (typeof result.totalPages === "number" && result.totalPages > 0) {
            pages = result.totalPages;
          }
        }

        setProducts(items.filter((p: any) => p?.slug && p?.title && p?.price));
        setTotalPages(pages);

        if (items.length > 0) {
          const maxPrice = items.reduce((max: number, p: any) => {
            const price = typeof p.price === "number" ? p.price : 0;
            return price > max ? price : max;
          }, 0);
          setMaxPrice(maxPrice);
        } else {
          setMaxPrice(null);
        }
      } catch (err: any) {
        setError(err.message || "Unknown error");
        setProducts([]);
        setMaxPrice(null);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(params), JSON.stringify(searchParams)]);

  return (
    <div className="grid grid-cols-3 justify-items-center gap-x-2 gap-y-5 max-[1300px]:grid-cols-3 max-lg:grid-cols-2 max-[500px]:grid-cols-1">
      {loading ? (
        <h3 className="text-3xl mt-5 text-center w-full col-span-full max-[1000px]:text-2xl max-[500px]:text-lg">Loading...</h3>
      ) : error ? (
        <h3 className="text-3xl mt-5 text-center w-full col-span-full text-red-500 max-[1000px]:text-2xl max-[500px]:text-lg">{error}</h3>
      ) : products.length > 0 ? (
        products.map((product: any) => (
          <ProductItem key={product.id} product={product} color="black" />
        ))
      ) : (
        <h3 className="text-3xl mt-5 text-center w-full col-span-full max-[1000px]:text-2xl max-[500px]:text-lg">
          There is no item for your search criteria
        </h3>
      )}
      <SearchPagination totalPages={totalPages} />
    </div>
  );
};

export default Products;
