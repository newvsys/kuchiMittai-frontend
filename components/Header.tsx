// *********************
// Role of the component: Header component
// Name of the component: Header.tsx
// Developer: perumal ponnusamy
// Version: 1.0
// Component call: <Header />
// Input parameters: no input parameters
// Output: Header component
// *********************

"use client";
import { usePathname } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import HeaderTop from "./HeaderTop";
import Image from "next/image";
import Link from "next/link";
import CartElement from "./CartElement";
import HeartElement from "./HeartElement";
import CategoryNavBar from "./CategoryNavBar";
import FlashMessageBanner from "./FlashMessageBanner";
import { useSession } from "next-auth/react";
import { useWishlistStore } from "@/app/_zustand/wishlistStore";
import apiClient from "@/lib/api";

const Header = () => {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const isSearchPage = pathname.startsWith("/search");
  const headerRef = useRef<HTMLElement | null>(null);
  const { wishlist, setWishlist, wishQuantity } = useWishlistStore();

  useEffect(() => {
    if (!isSearchPage || !headerRef.current) {
      document.documentElement.style.removeProperty("--search-sticky-top");
      return;
    }

    const setStickyTop = () => {
      const height = headerRef.current?.offsetHeight ?? 0;
      document.documentElement.style.setProperty("--search-sticky-top", `${height}px`);
    };

    setStickyTop();
    const resizeObserver = new ResizeObserver(setStickyTop);
    resizeObserver.observe(headerRef.current);
    window.addEventListener("resize", setStickyTop);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", setStickyTop);
      document.documentElement.style.removeProperty("--search-sticky-top");
    };
  }, [isSearchPage]);

  // getting all wishlist items by user id
  const getWishlistByUserId = async (id: string) => {
    const response = await apiClient.get(`/api/wishlist/${id}`, {
      cache: "no-store",
    });
    const wishlist = await response.json();
    const productArray: {
      id: string;
      title: string;
      price: number;
      image: string;
      slug:string
      stockAvailabillity: number;
    }[] = [];

    return; // temporary disable wishlist fetching while the issue is being resolved
    
    wishlist.map((item: any) => productArray.push({id: item?.product?.id, title: item?.product?.title, price: item?.product?.price, image: item?.product?.mainImage, slug: item?.product?.slug, stockAvailabillity: item?.product?.inStock}));
    
    setWishlist(productArray);
  };

 

  
  return (
    <header ref={headerRef} className={`bg-white ${isSearchPage ? "sticky top-0 z-50 shadow-sm" : ""}`}>
      <FlashMessageBanner />
      <HeaderTop />
      {pathname.startsWith("/admin") === false && <CategoryNavBar />}
      {pathname.startsWith("/admin") === true && (
        <div className="h-1 bg-white" />
      )}

    </header>
  );
};

export default Header;
