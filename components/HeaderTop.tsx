// *********************
// Role of the component: Topbar of the header
// Name of the component: HeaderTop.tsx
// Version: 1.0
// Component call: <HeaderTop />
// Input parameters: no input parameters
// Output: topbar with phone, email and login and register links
// *********************

"use client";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { Suspense, useState } from "react";
import { FaHeadphones } from "react-icons/fa6";
import { FaRegEnvelope } from "react-icons/fa6";
import { FaLocationDot } from "react-icons/fa6";
import { FaRegUser } from "react-icons/fa6";
import { FaHome } from "react-icons/fa";
import SearchInput from "./SearchInput";
import CartElement from "./CartElement";
import HeartElement from "./HeartElement";
import { useWishlistStore } from "@/app/_zustand/wishlistStore";
import { useProductStore } from "@/app/_zustand/store";

const HeaderTop = () => {
  const { data: session }: any = useSession();
  const router = useRouter();
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const { wishQuantity, setWishlist } = useWishlistStore();
  const { clearCart } = useProductStore();

  const handleLogout = () => {
    setIsAccountOpen(false);
    // Clear local state immediately for instant UI response
    clearCart();
    setWishlist([]);
    // Navigate immediately — don't wait for the server
    router.push("/?loggedout=true");
    // Invalidate the server session in the background
    signOut({ redirect: false });
  }
  return (
    <div className="text-black bg-white max-[573px]:px-0">
      <div className="flex items-center justify-between max-lg:flex-wrap gap-x-4 gap-y-2 max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10 py-2">

        <ul className="flex items-center gap-x-3 max-[370px]:gap-x-2">
          <li>
            <Link href="/">
              <img src="/logo.png" width={360} height={125} alt="logo" className="object-contain h-10 sm:h-12 w-auto max-w-[130px] sm:max-w-[180px]" />
            </Link>
          </li>
          <li>
            <div className="flex flex-col select-none leading-none">
              <span className="text-lg sm:text-2xl lg:text-3xl font-extrabold tracking-tight">
                <span style={{ color: "#16a34a" }}>Kuchi</span><span style={{ color: "#ca8a04" }}>Mit</span><span style={{ color: "#dc2626" }}>tai</span>
              </span>
              <span className="mt-1 text-xs font-medium tracking-[0.2em] uppercase text-gray-500 whitespace-nowrap">
                Let Food Be Your Medicine
              </span>
            </div>
          </li>
        </ul>
        <Suspense fallback={<div className="w-72" />}>
          <SearchInput />
        </Suspense>
        <ul className="flex items-center gap-x-5 max-[370px]:text-sm max-[370px]:gap-x-2 font-semibold">
          <li className="flex items-center">
            <Link href="/" className="flex items-center gap-x-2 text-sm font-semibold bg-gray-100 text-gray-700 px-3.5 py-2 rounded hover:bg-gray-200 transition-colors shadow-sm whitespace-nowrap">
              <FaHome className="text-gray-600 w-4 h-4" />
              <span>Home</span>
            </Link>
          </li>
          {!session ? (
            <>
              <li className="flex items-center">
                <Link href="/login" className="flex items-center gap-x-2 font-semibold">
                  <FaRegUser className="text-gray-700" />
                  <span>Login</span>
                </Link>
              </li>
              <li className="flex items-center">
                <Link href="/register" className="flex items-center gap-x-2 font-semibold">
                  <FaRegUser className="text-gray-700" />
                  <span>Register</span>
                </Link>
              </li>
            </>
          ) : (
            <>
              <span className="hidden lg:block text-sm text-gray-500 font-normal">Hello, <span className="font-semibold text-gray-800">{session.user?.email}</span></span>
              <li className="relative flex items-center">
                <div className="relative">
                  <button
                    tabIndex={0}
                    className="flex items-center gap-x-2 text-sm font-semibold bg-blue-600 text-white px-3.5 py-2 rounded hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap"
                    onClick={() => setIsAccountOpen((prev) => !prev)}
                  >
                    <FaRegUser className="text-white w-4 h-4" />
                    <span>My Account</span>
                    <svg className={`w-3 h-3 transition-transform ${isAccountOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  {isAccountOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setIsAccountOpen(false)} />
                      <div className="absolute left-0 z-20 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden text-sm text-gray-700">
                        {/* User header */}
                        <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-blue-600 to-indigo-500">
                          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                            <FaRegUser className="text-white w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-white font-semibold text-sm truncate">{session.user?.name || "My Account"}</p>
                            <p className="text-blue-100 text-xs truncate">{session.user?.email}</p>
                          </div>
                        </div>
                        {/* Menu items */}
                        <ul className="py-2">
                          <li onClick={() => setIsAccountOpen(false)}>
                            <Link href="/profile" className="flex items-center gap-3 px-5 py-2.5 hover:bg-blue-50 hover:text-blue-600 transition-colors group">
                              <span className="w-8 h-8 rounded-lg bg-gray-100 group-hover:bg-blue-100 flex items-center justify-center flex-shrink-0 transition-colors">
                                <FaRegUser className="text-gray-500 group-hover:text-blue-500 w-3.5 h-3.5" />
                              </span>
                              <span className="font-medium">My Profile</span>
                            </Link>
                          </li>
                          {session?.user?.role !== "admin" && (
                            <li onClick={() => setIsAccountOpen(false)}>
                              <Link href="/order-history" className="flex items-center gap-3 px-5 py-2.5 hover:bg-blue-50 hover:text-blue-600 transition-colors group">
                                <span className="w-8 h-8 rounded-lg bg-gray-100 group-hover:bg-blue-100 flex items-center justify-center flex-shrink-0 transition-colors">
                                  <svg className="w-3.5 h-3.5 text-gray-500 group-hover:text-blue-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                                </span>
                                <span className="font-medium">My Orders</span>
                              </Link>
                            </li>
                          )}
                        </ul>
                        <div className="border-t border-gray-100 py-2">
                          <button onClick={handleLogout} className="flex items-center gap-3 w-full px-5 py-2.5 text-left text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors group">
                            <span className="w-8 h-8 rounded-lg bg-gray-100 group-hover:bg-blue-100 flex items-center justify-center flex-shrink-0 transition-colors">
                              <svg className="w-3.5 h-3.5 text-gray-500 group-hover:text-blue-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                            </span>
                            <span className="font-medium">Logout</span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </li>
            </>
          )}
          <li className="flex items-center gap-x-4">
            <HeartElement wishQuantity={wishQuantity} />
            <CartElement />
          </li>
        </ul>
      </div>
    </div>
  );
};

export default HeaderTop;
