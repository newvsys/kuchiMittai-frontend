"use client"

import React from "react";
import { useProductStore } from "@/app/_zustand/store";
import Image from "next/image"
import Link from "next/link";
import { FaCheck, FaCircleQuestion, FaClock, FaXmark } from "react-icons/fa6";
import QuantityInputCart from "@/components/QuantityInputCart";
import { sanitize } from "@/lib/sanitize";
import { useSession } from "next-auth/react";
import { API_BASE } from "@/lib/env";
import { useRouter } from "next/navigation";

const showToast = async (msg: string, type: "success" | "error" = "success") => {
  const { default: toast } = await import("react-hot-toast");
  type === "success" ? toast.success(msg) : toast.error(msg);
};

export const CartModule = () => {

  const { products, removeFromCart, calculateTotals, total } =
    useProductStore();
  const { data: session } = useSession();
  const router = useRouter();
  const [hydrated, setHydrated] = React.useState(false);
  const [deliveryCharge, setDeliveryCharge] = React.useState<number>(0);
  const [freeDelivery, setFreeDelivery] = React.useState<boolean>(true);
  const [matchedRule, setMatchedRule] = React.useState<any>(null);
  const [showDeliveryInfo, setShowDeliveryInfo] = React.useState(false);

  React.useEffect(() => {
    if (hydrated) return;
    const unsub = useProductStore.persist.onFinishHydration(() => setHydrated(true));
    // In case hydration already finished between render and effect
    if (useProductStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, [hydrated]);

  React.useEffect(() => {
    if (total <= 0) { setDeliveryCharge(0); setFreeDelivery(true); setMatchedRule(null); return; }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`${API_BASE}/api/delivery-charges/calculate?orderAmount=${total}`, { signal: controller.signal })
        .then(r => r.json())
        .then(data => {
          if (data?.responseStatus === "SUCCESS") {
            setDeliveryCharge(data.applicableDeliveryCharge ?? 0);
            setFreeDelivery(data.isFreeDelivery ?? false);
            setMatchedRule(data.matchedRule ?? null);
          }
        })
        .catch(() => {});
    }, 0);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [total]);

  // Prefetch destination so Checkout button click is instant
  React.useEffect(() => {
    if (!hydrated) return;
    if (session) {
      router.prefetch("/checkout");
    } else {
      router.prefetch("/login?callbackUrl=%2Fcheckout");
    }
  }, [hydrated, session, router]);

  const handleRemoveItem = (id: string) => {
    removeFromCart(id);
    calculateTotals();
    showToast("Product removed from the cart");
  };

  const handleCheckout = () => {
    if (!session) {
      const callbackUrl = encodeURIComponent("/checkout");
      router.push(`/login?callbackUrl=${callbackUrl}`);
      return;
    }
    router.push("/checkout");
  };
  return (
    <>
    {!hydrated ? (
      /* Skeleton while Zustand rehydrates from localStorage */
      <div className="lg:grid lg:grid-cols-12 lg:gap-x-6 xl:gap-x-8">
        <div className="lg:col-span-7 rounded-2xl border border-gray-200 overflow-hidden bg-white">
          <div className="bg-gray-100 border-b border-gray-200 px-5 py-3">
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
          </div>
          {[1, 2].map(i => (
            <div key={i} className="flex gap-4 p-5 border-b border-gray-100">
              <div className="h-20 w-20 rounded-xl bg-gray-200 animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-3 w-2/3 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-1/3 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-1/4 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
        <div className="lg:col-span-5 mt-6 lg:mt-0 rounded-2xl border border-gray-200 bg-white p-6">
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-4 bg-gray-200 rounded animate-pulse" style={{ width: `${70 - i * 10}%` }} />
            ))}
          </div>
        </div>
      </div>
    ) : (
    <form className="lg:grid lg:grid-cols-12 lg:items-start lg:gap-x-6 xl:gap-x-8">
      <section aria-labelledby="cart-heading" className="lg:col-span-7">
        <div className="rounded-2xl border border-gray-200 overflow-hidden bg-white">
          <div className="bg-gray-100 border-b border-gray-200 px-5 py-3">
            <h2 id="cart-heading" className="text-sm font-bold text-gray-800">
              Cart Items {products.length > 0 ? `(${products.length})` : ""}
            </h2>
          </div>
          {products.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-700">Your cart is empty</h3>
              <p className="text-sm text-gray-500 mt-1">Browse our products and add something</p>
              <Link href="/search?categoryId=0&price=10000&minPrice=0" className="mt-4 px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
                Shop Now
              </Link>
            </div>
          ) : (
          <ul
            role="list"
            className="divide-y divide-gray-100"
          >
          {products.map((product) => (
            <li key={product.id} className="flex gap-4 p-4 sm:p-5 hover:bg-gray-50 transition-colors">
              <div className="flex-shrink-0">
                <Image
                  width={96}
                  height={96}
                  src={product?.image ? `/${product.image}` : "/product_placeholder.jpg"}
                  alt="laptop image"
                  className="h-20 w-20 sm:h-24 sm:w-24 rounded-xl object-cover border border-gray-100"
                />
              </div>

              <div className="flex flex-1 flex-col justify-between min-w-0">
                <div className="relative pr-9 sm:grid sm:grid-cols-2 sm:gap-x-6 sm:pr-0">
                  <div>
                    <div className="flex justify-between">
                      <h3 className="text-sm">
                        <Link
                          href={`#`}
                          className="font-medium text-gray-700 hover:text-gray-800"
                        >
                          {sanitize(product.title)}
                        </Link>
                      </h3>
                    </div>
                    {/* <div className="mt-1 flex text-sm">
                        <p className="text-gray-500">{product.color}</p>
                        {product.size ? (
                          <p className="ml-4 border-l border-gray-200 pl-4 text-gray-500">{product.size}</p>
                        ) : null}
                      </div> */}
                    <p className="mt-1 text-sm font-medium text-gray-900">
                      ₹ {product.price}
                    </p>
                  </div>

                  <div className="mt-4 sm:mt-0 sm:pr-9">
                    <QuantityInputCart product={product} />
                    <div className="absolute right-0 top-0">
                      <button
                        onClick={() => handleRemoveItem(product.id)}
                        type="button"
                        className="-m-2 inline-flex p-2 text-gray-400 hover:text-gray-500"
                      >
                        <span className="sr-only">Remove</span>
                        <FaXmark className="h-5 w-5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>

                <p className="mt-4 flex space-x-2 text-sm text-gray-700">
                  {1 ? (
                    <FaCheck
                      className="h-5 w-5 flex-shrink-0 text-green-500"
                      aria-hidden="true"
                    />
                  ) : (
                    <FaClock
                      className="h-5 w-5 flex-shrink-0 text-gray-300"
                      aria-hidden="true"
                    />
                  )}

                  <span>{1 ? "In stock" : `Ships in 3 days`}</span>
                </p>
              </div>
            </li>
          ))}
          </ul>
          )}
        </div>
      </section>

      {/* Order summary */}
      <section
        aria-labelledby="summary-heading"
        className="rounded-2xl border border-gray-200 overflow-hidden bg-white lg:col-span-5 mt-6 lg:mt-0"
      >
        <div className="bg-blue-500 border-b border-blue-600 px-6 py-3">
          <h2 id="summary-heading" className="text-sm font-bold text-white">Order Summary</h2>
        </div>
        <div className="px-6 py-5">
        <dl className="space-y-4">
          {(() => {
            const mrpTotal = products.reduce((sum, p) => sum + ((p.mrp ?? p.price) * p.amount), 0);
            const discount = Math.max(0, Math.round(mrpTotal - total));
            const hasDiscount = discount > 0;
            return (
              <>
                {hasDiscount && (
                  <div className="flex items-center justify-between text-gray-400 line-through text-xs">
                    <dt>MRP Total</dt>
                    <dd>₹ {Math.round(mrpTotal)}</dd>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <dt className="text-sm text-gray-600">Subtotal</dt>
                  <dd className="text-sm font-medium text-gray-900">₹ {total}</dd>
                </div>
                {hasDiscount && (
                  <div className="flex items-center justify-between text-green-600 font-semibold text-sm">
                    <dt>Discount (MRP savings)</dt>
                    <dd>− ₹ {discount}</dd>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                  <dt className="flex items-center text-sm text-gray-600">
                    <span>Delivery charge</span>
                    <button
                      type="button"
                      onClick={() => setShowDeliveryInfo(true)}
                      className="ml-2 flex-shrink-0 text-gray-400 hover:text-gray-500"
                      aria-label="Delivery charge details"
                    >
                      <FaCircleQuestion className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </dt>
                  <dd className="text-sm font-medium text-gray-900">{deliveryCharge === 0 ? "Free" : `₹ ${deliveryCharge}`}</dd>
                </div>
                {freeDelivery && (
                  <div className="flex items-center text-green-600 text-sm font-medium">
                    <span>Order eligible for free Delivery.</span>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                  <dt className="text-base font-medium text-gray-900">Order total</dt>
                  <dd className="text-base font-medium text-gray-900">₹ {total === 0 ? 0 : Math.round(total + deliveryCharge)}</dd>
                </div>
              </>
            );
          })()}
        </dl>
        {products.length > 0 && (
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={handleCheckout}
              className="rounded-lg px-6 py-2.5 text-sm font-semibold text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              Checkout
            </button>
          </div>
        )}
        </div>
      </section>
    </form>
    )} {/* end hydrated */}

    {/* Delivery charge info popup */}
    {showDeliveryInfo && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={() => setShowDeliveryInfo(false)}
      >
        <div
          className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between bg-gray-300 border-b border-gray-400 -mx-6 -mt-6 px-6 py-3 mb-5 rounded-t-xl">
            <h3 className="text-sm font-bold text-gray-800">Delivery Charge Details</h3>
            <button type="button" onClick={() => setShowDeliveryInfo(false)} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">&times;</button>
          </div>

          {matchedRule ? (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Rule</span>
                <span className="font-medium text-gray-800">{matchedRule.ruleName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Your subtotal</span>
                <span className="font-medium text-gray-800">₹{total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Order range</span>
                <span className="font-medium text-gray-800">
                  ₹{matchedRule.minOrderAmount}
                  {matchedRule.maxOrderAmount != null ? ` – ₹${matchedRule.maxOrderAmount}` : " & above"}
                </span>
              </div>
              <div className="flex justify-between border-t pt-3">
                <span className="text-gray-500">Delivery charge</span>
                <span className={`font-semibold ${matchedRule.isFreeDelivery ? "text-green-600" : "text-gray-900"}`}>
                  {matchedRule.isFreeDelivery ? "Free" : `₹${matchedRule.deliveryCharge}`}
                </span>
              </div>
              {matchedRule.description && (
                <p className="text-xs text-gray-400 italic pt-1">{matchedRule.description}</p>
              )}
              {!matchedRule.isFreeDelivery && (
                <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700 mt-2">
                  💡 Add ₹{Math.max(0, (matchedRule.maxOrderAmount ?? matchedRule.minOrderAmount) - total + 1)} more to check if you qualify for a lower delivery fee.
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              {freeDelivery
                ? "Your order qualifies for free delivery."
                : deliveryCharge === 0
                ? "Delivery is free for your order."
                : `A delivery charge of ₹${deliveryCharge} applies to your order.`}
            </p>
          )}
        </div>
      </div>
    )}

    </>
  )

}
