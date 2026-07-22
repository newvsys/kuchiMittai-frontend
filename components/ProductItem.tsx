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

import { sanitize } from "@/lib/sanitize";
import { StarRatingWidget } from "@/components/StarRatingWidget";

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
      <Link href={`/product/${product.slug}`} onClick={handleClick} className="flex justify-center flex-shrink-0 px-3 pt-3">
        <div className="relative h-40 w-full bg-gray-50 overflow-hidden rounded-xl">
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
            className="object-contain p-3 group-hover:scale-105 transition-transform duration-300"
            alt={sanitize(product?.title) || "Product image"}
          />
        </div>
      </Link>

      {/* Content area grows to fill card height */}
      <div className="flex flex-col flex-1 px-3 pt-2 pb-3 items-center text-center">
        <Link href={`/product/${product.slug}`} onClick={handleClick}>
          <h3 className="text-xs font-semibold text-gray-800 line-clamp-2 hover:text-blue-600 transition-colors leading-snug">
            {sanitize(product.title)}
          </h3>
        </Link>

        {typeof avgRating === "number" && typeof totalReviews === "number" && totalReviews > 0 && (
          <div className="flex justify-center">
            <StarRatingWidget rating={avgRating} total={totalReviews} distribution={ratingDistribution} />
          </div>
        )}

        {/* Price + button pinned to bottom */}
        <div className="mt-auto pt-1.5 flex flex-col gap-1.5 w-full items-center">
          <p className="text-sm font-bold text-gray-900">₹{product.price}</p>
          <Link
            href={`/product/${product?.slug}`}
            onClick={handleClick}
            className="w-3/4 text-center py-1.5 px-3 rounded-lg border border-blue-500 text-blue-600 text-xs font-medium hover:bg-blue-600 hover:text-white transition-colors flex items-center justify-center gap-1.5"
          >
            {navigating ? (
              <>
                <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Loading…
              </>
            ) : "View Product"}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ProductItem;
