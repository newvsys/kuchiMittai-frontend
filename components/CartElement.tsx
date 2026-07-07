// *********************
// Role of the component: Cart icon and quantity that will be located in the header
// Name of the component: CartElement.tsx
// Developer: perumal ponnusamy
// Version: 1.0
// Component call: <CartElement />
// Input parameters: no input parameters
// Output: Cart icon and quantity
// *********************

"use client";
import Link from 'next/link'
import React from 'react'
import { FaCartShopping } from 'react-icons/fa6'
import { useProductStore } from "@/app/_zustand/store";
import { useRouter, usePathname } from 'next/navigation';

const CartElement = () => {
    const { products } = useProductStore();
    const allQuantity = products.reduce((sum, p) => sum + p.amount, 0);
    const router = useRouter();
    const pathname = usePathname();
    const [navigating, setNavigating] = React.useState(false);

    // Reset spinner once navigation completes (pathname changed)
    React.useEffect(() => {
        setNavigating(false);
    }, [pathname]);

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        if (navigating) return;
        setNavigating(true);
        router.push("/cart");
    };

  return (
    <div className="relative">
            <Link href="/cart" onClick={handleClick}>
              {navigating ? (
                <svg className="animate-spin h-6 w-6 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              ) : (
                <FaCartShopping className="text-2xl text-black" />
              )}
              <span className="block w-6 h-6 bg-blue-600 text-white rounded-full flex justify-center items-center absolute top-[-17px] right-[-22px]">
                { allQuantity }
              </span>
            </Link>
          </div>
  )
}

export default CartElement