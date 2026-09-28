// *********************
// Role of the component: Quantity input for incrementing and decrementing product quantity on the cart page
// Name of the component: QuantityInputCart.tsx
// Developer: perumal ponnusamy
// Version: 1.0
// Component call: <QuantityInputCart product={product} />
// Input parameters: { product: ProductInCart }
// Output: one number input and two buttons
// *********************

"use client";
import { ProductInCart, useProductStore } from "@/app/_zustand/store";
import React, { useEffect, useState } from "react";
import { FaPlus } from "react-icons/fa6";
import { FaMinus } from "react-icons/fa6";

const QuantityInputCart = ({ product, maxQty } : { product: ProductInCart; maxQty?: number }) => {
  const [quantityCount, setQuantityCount] = useState<number>(product.amount);
  const { updateCartAmount, calculateTotals } = useProductStore();
  const soldOut = maxQty === 0;
  const atMaxQty = maxQty !== undefined && maxQty > 0 && quantityCount >= maxQty;

  // Bring the cart line back within the currently available stock
  useEffect(() => {
    if (maxQty === undefined || maxQty <= 0 || quantityCount <= maxQty) return;
    setQuantityCount(maxQty);
    updateCartAmount(product.id, maxQty);
    calculateTotals();
  }, [maxQty, quantityCount, product.id, updateCartAmount, calculateTotals]);

  const handleQuantityChange = (actionName: string): void => {
    if (actionName === "plus") {
      if (soldOut || atMaxQty) return;
      setQuantityCount(() => quantityCount + 1);
      updateCartAmount(product.id, quantityCount + 1);
      calculateTotals();

      
    } else if (actionName === "minus" && quantityCount !== 1) {
      setQuantityCount(() => quantityCount - 1);
      updateCartAmount(product.id, quantityCount - 1);
      calculateTotals();
    }
  };

  return (
    <div>
      <label htmlFor="Quantity" className="sr-only">
        {" "}
        Quantity{" "}
      </label>

      <div className="flex items-center justify-center rounded border border-gray-200 w-32">
        <button
          type="button"
          disabled={quantityCount <= 1}
          className="size-10 leading-10 text-gray-600 transition hover:opacity-75 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:opacity-40"
          onClick={() => handleQuantityChange("minus")}
        >
          <FaMinus />
        </button>

        <input
          type="number"
          id="Quantity"
          disabled={true}
          value={quantityCount}
          className="h-10 w-16 border-transparent text-center [-moz-appearance:_textfield] sm:text-sm [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none"
        />

        <button
          type="button"
          disabled={soldOut || atMaxQty}
          className="size-10 leading-10 text-gray-600 transition hover:opacity-75 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:opacity-40"
          onClick={() => handleQuantityChange("plus")}
        >
          <FaPlus />
        </button>
      </div>
      {soldOut ? (
        <p className="mt-1 text-xs font-medium text-red-600">⚠ Out of stock</p>
      ) : atMaxQty ? (
        <p className="mt-1 text-xs font-medium text-amber-600">
          ⚠ Only {maxQty} unit{maxQty === 1 ? "" : "s"} available
        </p>
      ) : null}
    </div>
  );
};

export default QuantityInputCart;
