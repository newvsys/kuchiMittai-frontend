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
import React, { useState } from "react";
import QuantityInput from "./QuantityInput";
import AddToCartSingleProductBtn from "./AddToCartSingleProductBtn";
import BuyNowSingleProductBtn from "./BuyNowSingleProductBtn";
import { useProductStore } from "@/app/_zustand/store";

const SingleProductDynamicFields = ({ product, maxQty }: { product: Product; maxQty?: number }) => {
  const [quantityCount, setQuantityCount] = useState<number>(1);
  const cartItems = useProductStore((state) => state.products);
  const inCartQty = cartItems.find((item) => item.id === product.id.toString())?.amount ?? 0;
  // Stock still available to add, after accounting for what's already in the cart
  const remainingQty = maxQty !== undefined ? Math.max(0, maxQty - inCartQty) : undefined;
  const atMaxQty = remainingQty !== undefined && quantityCount >= remainingQty;
  const soldOut = remainingQty === 0;
  return (
    <>
      <QuantityInput
        quantityCount={quantityCount}
        setQuantityCount={setQuantityCount}
        maxQty={remainingQty}
      />
      {atMaxQty && (
        <p className="text-sm text-amber-600 font-medium">
          {soldOut
            ? "⚠ You already have the maximum available quantity in your cart."
            : `⚠ Only ${remainingQty} unit${remainingQty === 1 ? "" : "s"} available — you've reached the maximum quantity.`}
        </p>
      )}
      {Boolean(product.inStock) && (
        <div className="flex gap-x-5 max-[500px]:flex-col max-[500px]:items-center max-[500px]:gap-y-1">
          <AddToCartSingleProductBtn
            quantityCount={quantityCount}
            product={product}
            disabled={soldOut}
          />
          <BuyNowSingleProductBtn
            quantityCount={quantityCount}
            product={product}
            disabled={soldOut}
          />
        </div>
      )}
    </>
  );
};

export default SingleProductDynamicFields;
