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



const AddToCartSingleProductBtn = ({ product, quantityCount, disabled, onAdded, className, validateStock } : SingleProductBtnProps) => {
  const { addToCart, calculateTotals } = useProductStore();
  const [isAdding, setIsAdding] = React.useState(false);

  const handleAddToCart = async () => {
    if (disabled || isAdding) return;
    setIsAdding(true);
    try {
      if (validateStock && !(await validateStock())) {
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
      className={className ?? "btn w-[200px] text-lg border border-gray-300 border-1 font-normal bg-white text-blue-500 hover:bg-blue-500 hover:text-white hover:border-blue-500 hover:scale-110 transition-all uppercase ease-in max-[500px]:w-full disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 disabled:hover:bg-white disabled:hover:text-blue-500"}
    >
      Add to cart
    </button>
  );
};

export default AddToCartSingleProductBtn;
