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

const SingleProductDynamicFields = ({ product, maxQty }: { product: Product; maxQty?: number }) => {
  const [quantityCount, setQuantityCount] = useState<number>(1);
  const atMaxQty = maxQty !== undefined && maxQty > 0 && quantityCount >= maxQty;
  return (
    <>
      <QuantityInput
        quantityCount={quantityCount}
        setQuantityCount={setQuantityCount}
        maxQty={maxQty}
      />
      {atMaxQty && (
        <p className="text-sm text-amber-600 font-medium">
          ⚠ Only {maxQty} unit{maxQty === 1 ? "" : "s"} available — you&apos;ve reached the maximum quantity.
        </p>
      )}
      {Boolean(product.inStock) && (
        <div className="flex gap-x-5 max-[500px]:flex-col max-[500px]:items-center max-[500px]:gap-y-1">
          <AddToCartSingleProductBtn
            quantityCount={quantityCount}
            product={product}
          />
          <BuyNowSingleProductBtn
            quantityCount={quantityCount}
            product={product}
          />
        </div>
      )}
    </>
  );
};

export default SingleProductDynamicFields;
