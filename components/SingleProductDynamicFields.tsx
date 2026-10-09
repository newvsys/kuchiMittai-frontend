// *********************
// Role of the component: Helper component for seperating dynamic client component from server component on the single product page with the intention to preserve SEO benefits of Next.js
// Name of the component: SingleProductDynamicFields.tsx
// Developer: perumal ponnusamy
// Version: 1.0
// Component call: <SingleProductDynamicFields product={product} />
// Input parameters: { product: Product }
// Output: Quantity, add to cart and buy now component on the single product page
// *********************

"use client";
import React, { useEffect, useState } from "react";
import QuantityInput from "./QuantityInput";
import AddToCartSingleProductBtn from "./AddToCartSingleProductBtn";
import BuyNowSingleProductBtn from "./BuyNowSingleProductBtn";
import { useProductStore } from "@/app/_zustand/store";

const SingleProductDynamicFields = ({ product, maxQty, ratingStatus, stockStatus, children }: { product: Product; maxQty?: number; ratingStatus?: React.ReactNode; stockStatus?: React.ReactNode; children?: React.ReactNode }) => {
  const [quantityCount, setQuantityCount] = useState<number>(1);
  const cartItems = useProductStore((state) => state.products);
  const inCartQty = cartItems.find((item) => item.id === product.id.toString())?.amount ?? 0;
  // Stock still available to add, after accounting for what's already in the cart
  const remainingQty = maxQty !== undefined ? Math.max(0, maxQty - inCartQty) : undefined;
  const atMaxQty = remainingQty !== undefined && quantityCount >= remainingQty;
  const soldOut = remainingQty === 0;

  // Reset to 1 when switching to another variant
  useEffect(() => {
    setQuantityCount(1);
  }, [product.id]);

  return (
    <div className="grid w-full gap-x-6 gap-y-4 sm:grid-cols-[minmax(0,1fr)_auto]">
      <div className="order-1 flex flex-col gap-y-3 sm:order-none sm:col-start-2 sm:row-start-1 sm:min-w-[11rem] sm:self-end [&>*]:w-full">
        <div className="flex justify-end">{ratingStatus}</div>
        <div className="flex flex-col gap-y-1">
          <div className="flex justify-end">{stockStatus}</div>
          <div className="flex justify-end">
            <QuantityInput
              quantityCount={quantityCount}
              setQuantityCount={setQuantityCount}
              maxQty={remainingQty}
            />
          </div>
        </div>
        {atMaxQty && (
          <p className="text-sm text-amber-600 font-medium">
            {soldOut
              ? "⚠ You already have the maximum available quantity in your cart."
              : `⚠ Only ${remainingQty} unit${remainingQty === 1 ? "" : "s"} available — you've reached the maximum quantity.`}
          </p>
        )}
        {Boolean(product.inStock) && (
          <>
            <AddToCartSingleProductBtn
              quantityCount={quantityCount}
              product={product}
              disabled={soldOut}
              onAdded={() => setQuantityCount(1)}
              className="btn w-full min-h-9 h-9 text-xs border border-gray-300 font-normal bg-white text-blue-500 hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-colors uppercase disabled:cursor-not-allowed disabled:opacity-50"
            />
            <BuyNowSingleProductBtn
              quantityCount={quantityCount}
              product={product}
              disabled={soldOut}
              className="btn w-full min-h-9 h-9 text-xs border border-blue-500 font-normal bg-blue-500 text-white hover:bg-white hover:text-blue-500 transition-colors uppercase disabled:opacity-70 disabled:cursor-not-allowed"
            />
          </>
        )}
      </div>
      <div className="order-2 flex min-w-0 flex-col items-start gap-y-4 sm:order-none sm:col-start-1 sm:row-start-1">
        {children}
      </div>
    </div>
  );
};

export default SingleProductDynamicFields;
