// *********************
// Role of the component: Product item component 
// Name of the component: ProductItem.tsx
// Developer: perumal ponnusamy
// Version: 1.0
// Component call: <ProductItem product={product} color={color} />
// Input parameters: { product: Product; color: string; }
// Output: Product item component that contains product image, title, link to the single product page, price, button...
// *********************

"use client";

import Image from "next/image";
import React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { sanitize } from "@/lib/sanitize";
import { StarRatingWidget } from "@/components/StarRatingWidget";
import AddToCartSingleProductBtn from "@/components/AddToCartSingleProductBtn";
import { useProductStore } from "@/app/_zustand/store";
import { API_BASE_PLAIN } from "@/lib/env";

const ProductItem = ({
  product,
  color,
  avgRating,
  totalReviews,
  ratingDistribution,
}: {
  product: Product;
  color: string;
  avgRating?: number;
  totalReviews?: number;
  ratingDistribution?: Record<string, number>;
}) => {
  const [navigating, setNavigating] = React.useState(false);
  const [availableQty, setAvailableQty] = React.useState<number | null>(null);
  const cartQuantity = useProductStore((state) =>
    state.products.find((item) => item.id === String(product.id))?.amount ?? 0
  );
  const searchParams = useSearchParams();
  const filterQuery = searchParams.toString();
  const productHref = `/product/${product.slug}${filterQuery ? `?${filterQuery}` : ""}`;
  const atMaxQty = availableQty !== null && cartQuantity >= availableQty;

  React.useEffect(() => {
    const controller = new AbortController();
    setAvailableQty(null);

    fetch(`${API_BASE_PLAIN}/api/inventory/variant/${product.id}`, {
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        const quantity = Number(data?.availableQty);
        setAvailableQty(Number.isFinite(quantity) ? quantity : null);
      })
      .catch((error) => {
        if (error.name !== "AbortError") setAvailableQty(null);
      });

    return () => controller.abort();
  }, [product.id]);

  const handleClick = (e: React.MouseEvent) => {
    if (navigating) {
      e.preventDefault();
      return;
    }
    setNavigating(true);
  };

  return (
    <div className="group flex flex-col w-full h-full rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">

      {/* Fixed-height image area */}
      <Link href={productHref} onClick={handleClick} className="flex justify-center flex-shrink-0 px-3 pt-3">
        <div className="relative aspect-square w-full bg-gray-50 overflow-hidden rounded-xl">
          <Image
            src={
              product.mainImage
                ? product.mainImage.startsWith("http")
                  ? product.mainImage
                  : `/${product.mainImage}`
                : "/product_placeholder.jpg"
            }
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-contain p-1 group-hover:scale-105 transition-transform duration-300"
            alt={sanitize(product?.title) || "Product image"}
          />
        </div>
      </Link>

      {/* Content area grows to fill card height */}
      <div className="flex flex-col flex-1 px-3 pt-2 pb-3 items-center text-center">
        <Link href={productHref} onClick={handleClick}>
          <h3 className="text-base font-semibold text-gray-800 line-clamp-2 hover:text-blue-600 transition-colors leading-snug">
            {sanitize(product.sku ? `${product.title}-${product.sku.replace(/.*-/, "")}` : product.title)}
          </h3>
        </Link>

        {typeof avgRating === "number" && typeof totalReviews === "number" && totalReviews > 0 && (
          <div className="flex justify-center">
            <StarRatingWidget rating={avgRating} total={totalReviews} distribution={ratingDistribution} />
          </div>
        )}

        {/* Price + button pinned to bottom */}
        <div className="mt-auto pt-1.5 flex flex-col gap-1.5 w-full items-center">
          <p className="text-xl font-bold text-gray-900">₹{product.price}</p>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              product.inStock === 1
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-600"
            }`}
          >
            {product.inStock === 1 ? "✔ In stock" : "✖ Out of stock"}
          </span>
          {product.inStock === 1 && atMaxQty && (
            <p className="text-xs font-semibold text-amber-600">
              ⚠ You already have the maximum available quantity in your cart.
            </p>
          )}
          <AddToCartSingleProductBtn
            product={product}
            quantityCount={1}
            disabled={product.inStock !== 1 || atMaxQty}
            className="btn w-full max-w-[200px] border border-gray-300 font-normal bg-white text-blue-500 hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-colors ease-in disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-blue-500"
          />
        </div>
      </div>
    </div>
  );
};

export default ProductItem;
