// *********************
// Role of the component: Quantity input for incrementing and decrementing product quantity on the single product page
// Name of the component: QuantityInput.tsx
// Developer: perumal ponnusamy
// Version: 1.0
// Component call: <QuantityInput quantityCount={quantityCount} setQuantityCount={setQuantityCount} />
// Input parameters: QuantityInputProps interface
// Output: one number input and two buttons
// *********************

"use client";

import React from "react";
import { FaPlus } from "react-icons/fa6";
import { FaMinus } from "react-icons/fa6";

interface QuantityInputProps {
  quantityCount: number;
  setQuantityCount: React.Dispatch<React.SetStateAction<number>>;
  maxQty?: number;
}

const QuantityInput = ({quantityCount, setQuantityCount, maxQty} : QuantityInputProps) => {


  const handleQuantityChange = (actionName: string): void => {
    if (actionName === "plus") {
      if (maxQty !== undefined && quantityCount >= maxQty) return;
      setQuantityCount(quantityCount + 1);
    } else if (actionName === "minus" && quantityCount !== 1) {
      setQuantityCount(quantityCount - 1);
    }
  };

  return (
    <div className="flex items-center gap-x-2 max-[500px]:justify-center">
      <p className="text-sm">Quantity:</p>

      <div className="flex items-center gap-1">
        <button
          type="button"
          className="size-8 text-gray-600 transition hover:opacity-75 flex justify-center items-center border"
          onClick={() => handleQuantityChange("minus")}
        >
          <FaMinus />
        </button>

        <input
          type="number"
          id="Quantity"
          disabled={true}
          value={quantityCount}
          className="h-8 w-14 rounded border-gray-200 text-sm"
        />

        <button
          type="button"
          className={`size-8 transition flex justify-center items-center border ${
            maxQty !== undefined && quantityCount >= maxQty
              ? "text-gray-300 cursor-not-allowed"
              : "text-gray-600 hover:opacity-75"
          }`}
          onClick={() => handleQuantityChange("plus")}
          disabled={maxQty !== undefined && quantityCount >= maxQty}
        >
          <FaPlus />
        </button>
      </div>
    </div>
  );
};

export default QuantityInput;
