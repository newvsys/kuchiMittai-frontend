// *********************
// Role of the component: Button for adding product to the cart on the single product page
// Name of the component: AddToCartSingleProductBtn.tsx
// Developer: perumal ponnusamy
// Version: 1.0
// Component call: <AddToCartSingleProductBtn product={product} quantityCount={quantityCount}  />
// Input parameters: SingleProductBtnProps interface
// Output: Button with adding to cart functionality
// *********************
"use client";



import React from "react";
import { useProductStore } from "@/app/_zustand/store";
import toast from "react-hot-toast";
import { API_BASE_PLAIN } from "@/lib/env";



const AddToCartSingleProductBtn = ({ product, quantityCount, disabled, onAdded, className } : SingleProductBtnProps) => {
  const { addToCart, calculateTotals } = useProductStore();
  const [isAdding, setIsAdding] = React.useState(false);

  const handleAddToCart = async () => {
    if (disabled || isAdding) return;
    setIsAdding(true);
    try {
      const response = await fetch(`${API_BASE_PLAIN}/api/inventory/variant/${product.id}`);
      if (!response.ok) throw new Error("Unable to load inventory");

      const data = await response.json();
      const availableQty = Number(data?.availableQty);
      if (!Number.isFinite(availableQty)) throw new Error("Invalid inventory response");

      const currentCartQuantity = useProductStore.getState().products.find(
        (item) => item.id === String(product.id)
      )?.amount ?? 0;
      if (currentCartQuantity + quantityCount > availableQty) {
        toast.error("Available stock limit reached");
        return;
      }
      addToCart({
        id: product?.id.toString(),
        title: product?.title,
        price: product?.price,
        mrp: product?.mrp,
        image: product?.mainImage,
        amount: quantityCount,
        variant: product?.sku ? product.sku.replace(/.*-/, "") : undefined
      });
      calculateTotals();
      toast.success("Product added to the cart");
      onAdded?.();
    } catch {
      toast.error("Unable to verify stock. Please try again.");
    } finally {
      setIsAdding(false);
    }
  };
  return (
    <button
      onClick={handleAddToCart}
      disabled={disabled || isAdding}
      className={className ?? "btn w-[160px] min-h-10 h-10 text-sm border border-gray-300 border-1 font-normal bg-white text-blue-500 hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-all uppercase ease-in disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-blue-500"}
    >
      Add to cart
    </button>
  );
};

export default AddToCartSingleProductBtn;
