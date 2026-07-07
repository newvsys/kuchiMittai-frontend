// *********************
// Role of the component: Buy Now button that adds product to the cart and redirects to the checkout page
// Name of the component: BuyNowSingleProductBtn.tsx
// Developer: perumal ponnusamy
// Version: 1.0
// Component call: <BuyNowSingleProductBtn product={product} quantityCount={quantityCount} />
// Input parameters: SingleProductBtnProps interface
// Output: Button with buy now functionality
// *********************

"use client";
import { useProductStore } from "@/app/_zustand/store";
import React, { useState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

const BuyNowSingleProductBtn = ({
  product,
  quantityCount,
}: SingleProductBtnProps) => {
  const router = useRouter();
  const { addToCart, calculateTotals } = useProductStore();
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(false);

  // Prefetch login page while user browses — navigation is instant on click
  React.useEffect(() => {
    if (status === "unauthenticated") {
      router.prefetch("/login?callbackUrl=/checkout");
    } else if (status === "authenticated") {
      router.prefetch("/checkout");
    }
  }, [status, router]);

  const handleAddToCart = () => {
    if (isLoading) return;
    // Always add the product to the cart first
    addToCart({
      id: product?.id.toString(),
      title: product?.title,
      price: product?.price,
      mrp: product?.mrp,
      image: product?.mainImage,
      amount: quantityCount,
    });
    calculateTotals();
    toast.success("Product added to the cart");

    setIsLoading(true);

    // If user is not authenticated, redirect to login with callback to checkout
    if (status !== "authenticated" || !session) {
      router.push("/login?callbackUrl=/checkout");
      return;
    }

    // If logged in, go directly to checkout
    router.push("/checkout");
  };

  return (
    <>
      {isLoading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/70 backdrop-blur-sm">
          <span className="loading loading-spinner loading-lg text-blue-500"></span>
          <p className="mt-3 text-sm font-medium text-gray-600">Taking you to checkout…</p>
        </div>
      )}
      <button
        onClick={handleAddToCart}
        disabled={isLoading}
        className="btn w-[200px] text-lg border border-blue-500 hover:border-blue-500 border-1 font-normal bg-blue-500 text-white hover:bg-white hover:scale-110 hover:text-blue-500 transition-all uppercase ease-in max-[500px]:w-full disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <span className="loading loading-spinner loading-sm"></span>
            Loading…
          </span>
        ) : (
          "Buy Now"
        )}
      </button>
    </>
  );
};

export default BuyNowSingleProductBtn;
