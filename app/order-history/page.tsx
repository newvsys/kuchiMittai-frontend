"use client";
import React, { useEffect, useRef, useState } from "react";
import TrackPackagePopup from "@/components/TrackPackagePopup";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { API_BASE } from "@/lib/env";

interface Order {
  orderNumber: string;
  status: string;
  totalAmount: number;
  currency: string;
  orderId: string;
  orderDate: string;
  shippingAddress: {
    name: string;
    address1: string;
    address2: string;
    landmark: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  products: Array<{
    orderItemId?: string;
    productId: string;
    title: string;
    quantity: number;
    mainImagePath?: string;
    variantName?: string;
    isReturnable?: string;
    returnPolicy?: {
      policyId?: number;
      name?: string;
      description?: string;
      returnWindowDays?: number;
      isReturnable: boolean;
      refundType?: string | null;
      returnMethod?: string | null;
      conditions?: Array<{
        id: number;
        policyId: number;
        conditionType: string;
        conditionValue: string;
      }>;
    };
  }>;
  shippingProducts: Array<{
    trackingNumber: string;
    shipmentId: number;
    awb?: string;
  }>;
}

interface CancelReason {
  reasonCode: string;
  reasonDescription: string;
  type: string;
}

interface ReturnReason {
  reasonCode: string;
  reasonDescription: string;
  type: string;
}

const OrderHistoryPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const abortRef = useRef<AbortController | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [trackPopup, setTrackPopup] = useState<{ open: boolean; shippingTrackId: string | null }>({ open: false, shippingTrackId: null });
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [orderTimeFilter, setOrderTimeFilter] = useState<"all" | "last30" | "lastYear" | "older">("all");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [retryingPaymentOrderId, setRetryingPaymentOrderId] = useState<string | null>(null);
  const [cancelDialog, setCancelDialog] = useState<{
    open: boolean;
    orderNumber: string | null;
  }>({ open: false, orderNumber: null });
  const [cancelReasons, setCancelReasons] = useState<CancelReason[]>([]);
  const [cancelReasonsLoading, setCancelReasonsLoading] = useState(false);
  const [cancelReasonsError, setCancelReasonsError] = useState("");
  const [selectedReasonCode, setSelectedReasonCode] = useState("");
  const [cancelReasonInlineError, setCancelReasonInlineError] = useState("");
  const [cancelComment, setCancelComment] = useState("");
  const [detailsDialog, setDetailsDialog] = useState<{
    open: boolean;
    order: Order | null;
  }>({ open: false, order: null });
  const [returnPolicyDialog, setReturnPolicyDialog] = useState<{
    open: boolean;
    policies: Array<{
      policy: NonNullable<Order["products"][number]["returnPolicy"]>;
      productTitle: string;
      variantName?: string;
    }>;
  }>({ open: false, policies: [] });
  const [returnOrderDialog, setReturnOrderDialog] = useState<{
    open: boolean;
    order: Order | null;
  }>({ open: false, order: null });
  const [returnReasons, setReturnReasons] = useState<ReturnReason[]>([]);
  const [returnReasonsLoading, setReturnReasonsLoading] = useState(false);
  const [returnReasonsError, setReturnReasonsError] = useState("");
  const [returnReasonCode, setReturnReasonCode] = useState("");
  const [returnComment, setReturnComment] = useState("");
  const [returnImages, setReturnImages] = useState<File[]>([]);
  const [returnSubmitting, setReturnSubmitting] = useState(false);

  const showToast = async (msg: string, type: "success" | "error" = "success") => {
    const { default: toast } = await import("react-hot-toast");
    type === "success" ? toast.success(msg) : toast.error(msg);
  };

  const fetchReturnReasons = async () => {
    try {
      setReturnReasonsLoading(true);
      setReturnReasonsError("");
      const res = await fetch(`${API_BASE}/api/api/reasons/type/ORDER-RETURN`);
      if (!res.ok) throw new Error("Failed to load return reasons");
      const data = await res.json();
      setReturnReasons(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setReturnReasonsError(err.message || "Failed to load return reasons");
      showToast(err.message || "Failed to load return reasons", "error");
    } finally {
      setReturnReasonsLoading(false);
    }
  };

  const handleReturnSubmit = async () => {
    if (!returnOrderDialog.order || !session) return;
    if (!returnReasonCode) {
      showToast("Please select a reason for return.", "error");
      return;
    }
    try {
      setReturnSubmitting(true);
      const formData = new FormData();
      const payload = {
        orderNumber: returnOrderDialog.order.orderNumber,
        userId: Number((session as any).user.id),
        reasonCode: returnReasonCode,
        comments: returnComment,
      };
      formData.append("returnOrderRequest", JSON.stringify(payload));
      returnImages.forEach(file => formData.append("images", file));
      const res = await fetch(`${API_BASE}/api/api/order-return`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to submit return request");
      showToast("Return request submitted successfully.");
      setReturnOrderDialog({ open: false, order: null });
      setReturnReasonCode("");
      setReturnComment("");
      setReturnImages([]);
      fetchOrders();
    } catch (err: any) {
      showToast(err.message || "Failed to submit return request.", "error");
    } finally {
      setReturnSubmitting(false);
    }
  };

  const fetchCancelReasons = async () => {
    try {
      setCancelReasonsLoading(true);
      setCancelReasonsError("");
      const res = await fetch(`${API_BASE}/api/api/reasons/type/ORDER-CANCEL`);
      if (!res.ok) {
        throw new Error("Failed to load cancellation reasons");
      }
      const data = await res.json();
      setCancelReasons(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setCancelReasonsError(err.message || "Failed to load cancellation reasons");
      showToast(err.message || "Failed to load cancellation reasons", "error");
    } finally {
      setCancelReasonsLoading(false);
    }
  };

  const handleRetryPayment = async (order: Order) => {
    if (!session) return;
    setRetryingPaymentOrderId(order.orderId);
    try {
      // Load Razorpay SDK if not already loaded
      if (!(window as any).Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Failed to load Razorpay SDK"));
          document.body.appendChild(script);
        });
      }

      const res = await fetch(`${API_BASE}/api/payments/retry-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.orderId, orderNumber: order.orderNumber }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || "Failed to initiate retry payment");
      }

      const data = await res.json();
      const payload = data?.data ?? data;

      const paymentOrderId =
        payload?.paymentOrderId || payload?.orderId || payload?.razorpayOrderId ||
        payload?.payment?.paymentOrderId || payload?.payment?.orderId;
      const paymentGatewayKey =
        payload?.paymentGatewayKey || payload?.gatewayKey || payload?.razorpayKey ||
        payload?.key || payload?.payment?.paymentGatewayKey;

      if (!paymentOrderId || !paymentGatewayKey) {
        throw new Error("Payment gateway details missing. Please contact support.");
      }

      // Load logo as base64
      let logoBase64: string | undefined;
      try {
        const logoRes = await fetch("/companyLogo/CompanyLogo.png");
        const blob = await logoRes.blob();
        logoBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } catch { /* proceed without logo */ }

      const userEmail = (session as any).user?.email || "";
      const userPhone = (session as any).user?.phone || "";

      const razorpayOptions = {
        key: paymentGatewayKey,
        amount: Number(payload?.amount ?? order.totalAmount) * 100,
        currency: payload?.currency || "INR",
        name: payload?.storeName || "KuchiMittai",
        image: logoBase64,
        description: `Payment for Order #${order.orderNumber}`,
        order_id: paymentOrderId,
        handler: async function (response: any) {
          showToast("Payment successful!");
          try {
            const verifyRes = await fetch(`${API_BASE}/api/payments/verify`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            if (verifyRes.ok) {
              const verifyData = await verifyRes.json();
              if (verifyData.status === "success") {
                router.push(`/order-status/${order.orderNumber}`);
              } else {
                showToast("Payment verification failed", "error");
                fetchOrders();
              }
            } else {
              showToast("Payment verification failed", "error");
              fetchOrders();
            }
          } catch {
            showToast("Payment verification error", "error");
            fetchOrders();
          }
        },
        prefill: { email: userEmail, contact: userPhone },
        theme: { color: "#2563eb" },
        modal: { ondismiss: () => setRetryingPaymentOrderId(null) },
      };

      const rzp = new (window as any).Razorpay(razorpayOptions);
      rzp.open();
    } catch (err: any) {
      showToast(err.message || "Could not initiate payment. Please try again.", "error");
      setRetryingPaymentOrderId(null);
    }
  };

  const fetchOrders = async (options?: { search?: string; statuses?: string[]; signal?: AbortSignal }) => {
    setLoading(true);
    setError("");

    try {
      const API_BASE_URL = API_BASE;

      const params = new URLSearchParams();
      params.append("userId", String((session as any).user.id));

      if (options?.search && options.search.trim()) {
        params.append("search", options.search.trim());
      }

      (options?.statuses || []).forEach((status) => {
        if (status) {
          params.append("status", status);
        }
      });

      const res = await fetch(`${API_BASE_URL}/api/order-history?${params.toString()}`, {
        signal: options?.signal,
      });
      if (!res.ok) throw new Error("Failed to fetch order history");
      const data = await res.json();
      const sorted = (data.orders || []).sort((a: Order, b: Order) =>
        new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()
      );
      setOrders(sorted);
    } catch (err: any) {
      if (err.name === "AbortError") return;
      setError(err.message || "Error fetching order history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.replace("/login");
      return;
    }
    const timer = setTimeout(() => {
      const controller = new AbortController();
      abortRef.current = controller;
      fetchOrders({ signal: controller.signal });
    }, 0);
    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [session, status, router]);

  useEffect(() => {
    if (cancelDialog.open) {
      setSelectedReasonCode("");
      setCancelComment("");
      if (cancelReasons.length === 0 && !cancelReasonsLoading) {
        fetchCancelReasons();
      }
    }
  }, [cancelDialog.open]);

  useEffect(() => {
    if (returnOrderDialog.open && returnOrderDialog.order) {
      setReturnReasonCode("");
      setReturnComment("");
      setReturnImages([]);
      if (returnReasons.length === 0 && !returnReasonsLoading) {
        fetchReturnReasons();
      }
    }
  }, [returnOrderDialog.open]);

  const handleCancelOrder = async (orderNumber: string, reasonCode: string, comment?: string) => {
    if (!session) return;
    if (!reasonCode) {
      return;
    }

    try {
      const API_BASE_URL = API_BASE;
      const payload = {
        orderNumber,
        reasonCode,
        comment
      };

      const res = await fetch(`${API_BASE_URL}/api/order-cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Failed to cancel order item");
      }

      showToast("Order cancelled successfully.");
      // Refresh orders to reflect updated status from backend
      fetchOrders();
    } catch (err: any) {
      showToast(err.message || "Failed to cancel order.", "error");
    }
  };

  const handleConfirmCancelClick = async () => {
    if (!cancelDialog.orderNumber) {
      setCancelDialog({ open: false, orderNumber: null });
      showToast("Order number is not available for cancellation.", "error");
      return;
    }

    if (!selectedReasonCode) {
      setCancelReasonInlineError("Please select a reason for cancellation.");
      return;
    }

    setCancelReasonInlineError("");
    await handleCancelOrder(cancelDialog.orderNumber, selectedReasonCode, cancelComment);
    setCancelDialog({ open: false, orderNumber: null });
    setSelectedReasonCode("");
    setCancelComment("");
  };

  const toggleStatusFilter = (value: string) => {
    setSelectedStatuses(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  const handleSearch = () => {
    fetchOrders({ search: searchTerm, statuses: selectedStatuses });
  };

  if (status === "loading" || !session || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-10">
          {/* Header skeleton */}
          <div className="mb-8">
            <div className="h-8 w-36 bg-gray-200 rounded-lg animate-pulse mb-2" />
            <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
          </div>
          <div className="flex gap-6 items-start">
            {/* Sidebar skeleton */}
            <div className="w-56 flex-shrink-0 bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="h-9 bg-gray-200 animate-pulse" />
              <div className="p-5 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-gray-100 animate-pulse" />
                    <div className="h-3 rounded bg-gray-100 animate-pulse flex-1" />
                  </div>
                ))}
              </div>
            </div>
            {/* Order list skeleton */}
            <div className="flex-1 min-w-0 space-y-3">
              <div className="h-10 bg-white rounded-xl border border-gray-200 animate-pulse mb-6" />
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                  <div className="h-12 bg-gray-200 animate-pulse" />
                  <div className="px-5 py-4 flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gray-100 animate-pulse flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-100 rounded animate-pulse w-2/3" />
                      <div className="h-3 bg-gray-100 rounded animate-pulse w-1/3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl mb-3">⚠️</p>
          <p className="text-sm text-red-600 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  const statusOptions = [
    "Confirmed",
    "Delivered",
    "Cancelled",
    "Returned",
  ];

  const filteredOrders =
    selectedStatuses.length === 0
      ? orders
      : orders.filter(order =>
          selectedStatuses
            .map(s => s.toLowerCase())
            .includes((order.status || "").toLowerCase())
        );

  const now = new Date();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const oneYearMs = 365 * 24 * 60 * 60 * 1000;

  const timeFilteredOrders = filteredOrders.filter(order => {
    if (orderTimeFilter === "all") return true;

    const orderDate = new Date(order.orderDate);
    const time = orderDate.getTime();
    if (Number.isNaN(time)) return true;

    const diff = now.getTime() - time;
    if (diff < 0) return true;

    if (orderTimeFilter === "last30") {
      return diff <= thirtyDaysMs;
    }
    if (orderTimeFilter === "lastYear") {
      return diff <= oneYearMs;
    }
    if (orderTimeFilter === "older") {
      return diff > oneYearMs;
    }

    return true;
  });

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const displayedOrders =
    !normalizedSearch
      ? timeFilteredOrders
      : timeFilteredOrders.filter(order => {
          const inOrderNumber = (order.orderNumber || "")
            .toLowerCase()
            .includes(normalizedSearch);
          const inProducts = order.products?.some(p =>
            (p.title || "").toLowerCase().includes(normalizedSearch)
          );
          return inOrderNumber || inProducts;
        });

  // Pagination: 10 orders per page
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(displayedOrders.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedOrders = displayedOrders.slice(startIndex, startIndex + pageSize);

  const getStatusBadge = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "delivered")
      return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">✓ Delivered</span>;
    if (["cancelled", "canceled"].includes(s))
      return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-600">✕ Cancelled</span>;
    if (s === "returned")
      return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-600">↩ Returned</span>;
    if (s === "p" || s === "pending")
      return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">⏳ Pending</span>;
    if (["confirmed", "submitted", "created"].includes(s))
      return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">● {status}</span>;
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">{status === "P" ? "PENDING" : status}</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-10">

        {/* Page header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">My Orders</h2>
            <p className="text-sm text-gray-500 mt-0.5">{displayedOrders.length} order{displayedOrders.length !== 1 ? "s" : ""} found</p>
          </div>
        </div>

        <div className="flex gap-6 items-start">

          {/* ── Filters sidebar ── */}
          <aside className="w-96 flex-shrink-0 bg-white rounded-2xl border border-gray-200 overflow-hidden sticky top-4">
            <p className="text-lg font-bold text-gray-700 uppercase tracking-widest px-5 py-3 bg-gray-300 border-b border-gray-300">Filters</p>
            <div className="p-5">

            <p className="text-lg font-semibold text-gray-400 uppercase tracking-wide mb-2">Status</p>
            <div className="space-y-3 text-xl mb-5">
              {statusOptions.map(option => (
                <label key={option} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    className="h-5 w-5 rounded accent-blue-600"
                    checked={selectedStatuses.includes(option)}
                    onChange={() => toggleStatusFilter(option)}
                  />
                  <span className={`text-xl transition-colors ${selectedStatuses.includes(option) ? "text-blue-600 font-semibold" : "text-gray-600 group-hover:text-gray-900"}`}>{option}</span>
                </label>
              ))}
            </div>

            <p className="text-lg font-semibold text-gray-400 uppercase tracking-wide mb-2">Order Time</p>
            <div className="space-y-3 text-xl">
              {([["all","All time"],["last30","Last 30 days"],["lastYear","Last 1 year"],["older","Older"]] as const).map(([val, label]) => (
                <label key={val} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="radio"
                    name="orderTime"
                    className="h-5 w-5 accent-blue-600"
                    checked={orderTimeFilter === val}
                    onChange={() => setOrderTimeFilter(val)}
                  />
                  <span className={`text-xl transition-colors ${orderTimeFilter === val ? "text-blue-600 font-semibold" : "text-gray-600 group-hover:text-gray-900"}`}>{label}</span>
                </label>
              ))}
            </div>
            </div>
          </aside>

          {/* ── Order list ── */}
          <div className="flex-1 min-w-0">

            {/* Search */}
            <div className="flex gap-2 mb-6">
              <div className="relative flex-1">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                  placeholder="Search by order # or product name"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSearch()}
                />
              </div>
              <button
                type="button"
                className="px-5 py-2.5 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700 font-semibold shadow-sm transition-colors"
                onClick={handleSearch}
              >
                Search
              </button>
            </div>

            {displayedOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl shadow-sm border border-gray-100">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-gray-700 mb-1">No orders found</p>
                <p className="text-xs text-gray-400">Try adjusting your filters or search term.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {paginatedOrders.map(order => {
                  const statusLabel = order.status === "P" ? "PENDING" : order.status;
                  const canCancel = ["confirmed","submitted","created"].includes((order.status || "").toLowerCase());
                  const canReturn = (order.status || "").toLowerCase() === "delivered" && order.products.some(p => p.returnPolicy?.isReturnable === true);
                  const notReturnable = (order.status || "").toLowerCase() === "delivered" && !order.products.some(p => p.returnPolicy?.isReturnable === true);

                  return (
                    <div key={order.orderId} className="rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">

                      {/* Order header */}
                      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-gray-200 border-b border-gray-300">
                        <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                          <span className="flex items-center gap-1">
                            <span className="font-semibold text-gray-600">Order #</span>
                            <span className="font-mono text-gray-800">{order.orderNumber}</span>
                          </span>
                          <span className="text-gray-300">|</span>
                          <span>{new Date(order.orderDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                          <span className="text-gray-300">|</span>
                          <span className="font-semibold text-gray-800">₹{order.totalAmount.toFixed(2)}</span>
                          {order.shippingProducts?.some(sp => sp.trackingNumber) && order.shippingProducts.map((sp, spIdx) => (
                            <button
                              key={sp.trackingNumber}
                              type="button"
                              className="flex items-center gap-1 font-medium text-blue-600 hover:text-blue-800 transition-colors"
                              onClick={() => setTrackPopup({ open: true, shippingTrackId: sp.trackingNumber })}
                            >
                              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              Track{order.shippingProducts.length > 1 ? ` #${spIdx + 1}` : ""}
                            </button>
                          ))}
                          {order.shippingProducts?.some(sp => sp.awb) && order.shippingProducts.filter(sp => sp.awb).map((sp, spIdx) => (
                            <a
                              key={`awb-${sp.trackingNumber}`}
                              href={`https://shiprocket.co/tracking/${sp.awb}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 font-medium text-blue-600 hover:text-blue-800 transition-colors"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                              Courier Tracking{order.shippingProducts.length > 1 ? ` #${spIdx + 1}` : ""}
                            </a>
                          ))}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-500">Status: <span className="font-semibold text-gray-800">{order.status === "P" ? "PENDING" : order.status}</span></span>
                          <button
                            type="button"
                            className="text-xs text-blue-600 hover:text-blue-800 font-semibold border border-blue-200 rounded-lg px-3 py-1 hover:bg-blue-50 transition-colors"
                            onClick={() => setDetailsDialog({ open: true, order })}
                          >
                            View Details
                          </button>
                        </div>
                      </div>

                      {/* Products */}
                      <div className="px-5 py-4 divide-y divide-gray-50">
                        {order.products.map((item, idx) => {
                          let imgSrc = item.mainImagePath || "";
                          if (imgSrc.startsWith("public/")) imgSrc = imgSrc.replace(/^public\//, "/");
                          return (
                            <div key={item.orderItemId || `${item.productId}-${idx}`} className="flex items-center gap-4 py-2.5 first:pt-0 last:pb-0">
                              {imgSrc ? (
                                <img src={imgSrc} alt={item.title} className="w-14 h-14 object-contain rounded-xl border border-gray-100 bg-gray-50 flex-shrink-0" />
                              ) : (
                                <div className="w-14 h-14 rounded-xl border border-gray-100 bg-gray-100 flex-shrink-0 flex items-center justify-center">
                                  <svg className="h-6 w-6 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
                                  </svg>
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                                {item.variantName && <p className="text-xs text-gray-500 mt-0.5">{item.variantName}</p>}
                                <p className="text-xs text-gray-400 mt-0.5">Qty: {item.quantity}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Action row */}
                      <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50">

                        {canReturn && (
                          <>
                            <button
                              type="button"
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-orange-300 text-orange-600 hover:bg-orange-50 transition-colors"
                              onClick={() => setReturnOrderDialog({ open: true, order })}
                            >
                              ↩ Return Order
                            </button>
                            <button
                              type="button"
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
                              onClick={() => {
                                const seen = new Set<string>();
                                const policies = order.products
                                  .filter(p => !!p.returnPolicy)
                                  .reduce<Array<{ policy: NonNullable<Order["products"][number]["returnPolicy"]>; productTitle: string; variantName?: string }>>((acc, p) => {
                                    const policyKey = p.returnPolicy!.policyId != null ? String(p.returnPolicy!.policyId) : `${p.returnPolicy!.name ?? ""}|${p.returnPolicy!.returnWindowDays ?? ""}|${p.returnPolicy!.isReturnable}`;
                                    const key = `${p.title}|${p.variantName ?? ""}|${policyKey}`;
                                    if (!seen.has(key)) { seen.add(key); acc.push({ policy: p.returnPolicy!, productTitle: p.title, variantName: p.variantName }); }
                                    return acc;
                                  }, []);
                                setReturnPolicyDialog({ open: true, policies });
                              }}
                            >
                              Return Policy
                            </button>
                          </>
                        )}
                        {notReturnable && (
                          <span className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-50 text-red-500">Not eligible for return</span>
                        )}
                        {order.status === "P" && (
                          <button
                            type="button"
                            disabled={retryingPaymentOrderId === order.orderId}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            onClick={() => handleRetryPayment(order)}
                          >
                            {retryingPaymentOrderId === order.orderId ? (
                              <><svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Processing…</>
                            ) : "Complete Payment"}
                          </button>
                        )}
                        {canCancel && (
                          <button
                            type="button"
                            className="text-xs underline underline-offset-2 transition-colors cursor-pointer"
                            onClick={() => setCancelDialog({ open: true, orderNumber: order.orderNumber })}
                          >
                            Cancel Order
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {displayedOrders.length > 0 && totalPages > 1 && (
              <div className="mt-6 flex flex-col items-center gap-2">
                <p className="text-xs text-gray-400">
                  Showing {startIndex + 1}–{Math.min(startIndex + pageSize, displayedOrders.length)} of {displayedOrders.length} orders
                </p>
                <div className="flex items-center gap-1">
                  <button
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={safeCurrentPage === 1}
                  >
                    ← Prev
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(pg => (
                    <button
                      key={pg}
                      className={`w-9 h-9 text-sm rounded-lg border transition-colors ${pg === safeCurrentPage ? "bg-blue-600 text-white border-blue-600 font-semibold" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                      onClick={() => setCurrentPage(pg)}
                    >
                      {pg}
                    </button>
                  ))}
                  <button
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={safeCurrentPage === totalPages}
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
          {trackPopup.open && trackPopup.shippingTrackId && (
            <TrackPackagePopup
              shippingTrackId={trackPopup.shippingTrackId}
              onClose={() => setTrackPopup({ open: false, shippingTrackId: null })}
            />
          )}
          {cancelDialog.open && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => { setCancelDialog({ open: false, orderNumber: null }); setSelectedReasonCode(""); setCancelComment(""); setCancelReasonInlineError(""); }}>
              <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* Gradient header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-500 px-8 py-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 rounded-xl p-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636L5.636 18.364M5.636 5.636l12.728 12.728" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">Cancel Order</h3>
                      <p className="text-xs text-blue-100 mt-0.5 font-mono">{cancelDialog.orderNumber}</p>
                    </div>
                  </div>
                  <button type="button" className="text-white/70 hover:text-white text-2xl leading-none transition-colors" onClick={() => { setCancelDialog({ open: false, orderNumber: null }); setSelectedReasonCode(""); setCancelComment(""); setCancelReasonInlineError(""); }}>&times;</button>
                </div>
                {/* Warning strip */}
                <div className="bg-blue-50 border-b border-blue-100 px-8 py-3 flex items-start gap-2.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                  <p className="text-xs text-blue-700">This action cannot be undone. Please select a reason before confirming.</p>
                </div>
                <div className="px-8 py-6">
                  {cancelReasonsLoading ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
                      <svg className="animate-spin h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                      Loading reasons…
                    </div>
                  ) : cancelReasonsError ? (
                    <p className="text-sm text-red-600 py-4">{cancelReasonsError}</p>
                  ) : (
                    <div className="space-y-5">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Reason <span className="text-red-500">*</span></label>
                        <select
                          className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                          value={selectedReasonCode}
                          onChange={e => { setSelectedReasonCode(e.target.value); if (e.target.value) setCancelReasonInlineError(""); }}
                        >
                          <option value="">Select a reason</option>
                          {cancelReasons.map(reason => (
                            <option key={reason.reasonCode} value={reason.reasonCode}>{reason.reasonDescription}</option>
                          ))}
                        </select>
                        {cancelReasonInlineError && <p className="mt-1.5 text-xs text-red-500">{cancelReasonInlineError}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Comment <span className="text-xs text-gray-400 font-normal">(optional)</span></label>
                        <textarea
                          className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                          rows={4}
                          value={cancelComment}
                          onChange={e => setCancelComment(e.target.value)}
                          placeholder="e.g. item not required any more."
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-end gap-3 px-8 py-5 border-t bg-gray-50">
                  <button
                    type="button"
                    className="px-5 py-2.5 text-sm rounded-xl border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 font-medium transition-colors"
                    onClick={() => { setCancelDialog({ open: false, orderNumber: null }); setSelectedReasonCode(""); setCancelComment(""); setCancelReasonInlineError(""); }}
                  >
                    Keep Order
                  </button>
                  <button
                    type="button"
                    className="px-5 py-2.5 text-sm rounded-xl bg-blue-500 text-white hover:bg-blue-600 font-semibold transition-colors shadow-sm"
                    onClick={handleConfirmCancelClick}
                  >
                    Cancel Order
                  </button>
                </div>
              </div>
            </div>
          )}
          {returnOrderDialog.open && returnOrderDialog.order && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => { setReturnOrderDialog({ open: false, order: null }); setReturnReasonCode(""); setReturnComment(""); setReturnImages([]); }}>
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50 flex-shrink-0">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">Return Order</h3>
                    <p className="text-xs text-gray-500 mt-0.5 font-mono">{returnOrderDialog.order.orderNumber}</p>
                  </div>
                  <button type="button" className="text-gray-400 hover:text-gray-700 text-2xl leading-none" onClick={() => { setReturnOrderDialog({ open: false, order: null }); setReturnReasonCode(""); setReturnComment(""); setReturnImages([]); }}>&times;</button>
                </div>
                <div className="px-6 py-5 flex-1">
                  {returnReasonsLoading ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
                      <svg className="animate-spin h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                      Loading reasons…
                    </div>
                  ) : returnReasonsError ? (
                    <p className="text-sm text-red-600 py-4">{returnReasonsError}</p>
                  ) : (
                    <div className="space-y-4 mb-5">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Reason <span className="text-red-500">*</span></label>
                        <select
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                          value={returnReasonCode}
                          onChange={e => setReturnReasonCode(e.target.value)}
                        >
                          <option value="">Select a reason</option>
                          {returnReasons.map(r => (
                            <option key={r.reasonCode} value={r.reasonCode}>{r.reasonDescription}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Comments <span className="text-xs text-gray-400 font-normal">(optional)</span></label>
                        <textarea
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                          rows={3}
                          placeholder="Describe the issue…"
                          value={returnComment}
                          onChange={e => setReturnComment(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                  <div className="mb-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Upload Product Images
                      <span className="ml-1 text-xs text-gray-400 font-normal">(multiple allowed)</span>
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="block w-full text-xs text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-gray-200 file:text-xs file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100"
                      onChange={e => {
                        const incoming = Array.from(e.target.files || []);
                        setReturnImages(prev => {
                          const existing = new Set(prev.map(f => f.name + f.size));
                          const deduped = incoming.filter(f => !existing.has(f.name + f.size));
                          return [...prev, ...deduped];
                        });
                        e.target.value = "";
                      }}
                    />
                    {returnImages.length > 0 && (
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {returnImages.map((f, i) => (
                          <div key={i} className="relative group border border-gray-100 rounded-xl overflow-hidden">
                            <img src={URL.createObjectURL(f)} alt={f.name} className="w-full h-20 object-cover" />
                            <div className="px-1 py-0.5 bg-white text-[10px] text-gray-500 truncate">{f.name}</div>
                            <button
                              type="button"
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] leading-none opacity-80 hover:opacity-100"
                              onClick={() => setReturnImages(prev => prev.filter((_, idx) => idx !== i))}
                            >✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50 flex-shrink-0">
                  <button
                    type="button"
                    className="px-4 py-2 text-sm rounded-xl border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 font-medium transition-colors"
                    onClick={() => { setReturnOrderDialog({ open: false, order: null }); setReturnReasonCode(""); setReturnComment(""); setReturnImages([]); }}
                    disabled={returnSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl bg-orange-500 text-white hover:bg-orange-600 font-semibold disabled:opacity-60 transition-colors"
                    onClick={handleReturnSubmit}
                    disabled={returnSubmitting || returnReasonsLoading}
                  >
                    {returnSubmitting ? (
                      <><svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Submitting…</>
                    ) : "Submit Return"}
                  </button>
                </div>
              </div>
            </div>
          )}
          {returnPolicyDialog.open && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setReturnPolicyDialog({ open: false, policies: [] })}>
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50 flex-shrink-0">
                  <h3 className="text-base font-semibold text-gray-900">Return Policies</h3>
                  <button type="button" className="text-gray-400 hover:text-gray-700 text-2xl leading-none" onClick={() => setReturnPolicyDialog({ open: false, policies: [] })}>&times;</button>
                </div>
                <div className="px-6 py-5">
                  {returnPolicyDialog.policies.length === 0 ? (
                    <p className="text-sm text-gray-500">No return policies available.</p>
                  ) : (
                    <div className="space-y-4">
                      {returnPolicyDialog.policies.map(({ policy, productTitle, variantName }, idx) => (
                        <div key={policy.policyId ?? idx} className="border border-gray-100 rounded-xl p-4 text-sm">
                          <div className="mb-3">
                            <div className="font-semibold text-gray-900">{productTitle}</div>
                            {variantName && <div className="text-xs text-gray-500 mt-0.5">Variant: {variantName}</div>}
                          </div>
                          <div className="font-semibold text-gray-800 mb-1">{policy.name}</div>
                          {policy.description && <p className="text-gray-500 text-xs mb-3">{policy.description}</p>}
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-gray-700 mb-3">
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium">Returnable:</span>
                              <span className={policy.isReturnable ? "text-green-600 font-semibold" : "text-red-500 font-semibold"}>
                                {policy.isReturnable ? "Yes" : "No"}
                              </span>
                            </div>
                            {policy.returnWindowDays != null && (
                              <div><span className="font-medium">Window:</span> {policy.returnWindowDays} days</div>
                            )}
                            {policy.refundType && (
                              <div><span className="font-medium">Refund:</span> {policy.refundType}</div>
                            )}
                            {policy.returnMethod && (
                              <div><span className="font-medium">Method:</span> {policy.returnMethod}</div>
                            )}
                          </div>
                          {policy.conditions && policy.conditions.length > 0 && (
                            <div>
                              <div className="font-medium text-gray-700 mb-1.5 text-xs uppercase tracking-wide">Conditions</div>
                              <table className="w-full text-xs border border-gray-100 rounded-lg overflow-hidden">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="text-left px-3 py-2 font-medium text-gray-600">Type</th>
                                    <th className="text-left px-3 py-2 font-medium text-gray-600">Value</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {policy.conditions.map(cond => (
                                    <tr key={cond.id} className="border-t border-gray-100">
                                      <td className="px-3 py-2 text-gray-700">{cond.conditionType}</td>
                                      <td className="px-3 py-2 text-gray-700">{cond.conditionValue}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          {detailsDialog.open && detailsDialog.order && (() => {
            const o = detailsDialog.order;
            const addr = o.shippingAddress;
            const addressLine = [addr?.address1, addr?.address2, addr?.landmark, addr?.city, addr?.state, addr?.postalCode]
              .filter(Boolean).join(", ");
            const trackingNumber = o.shippingProducts?.[0]?.trackingNumber;
            return (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                onClick={() => setDetailsDialog({ open: false, order: null })}
              >
                <div
                  className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden"
                  onClick={e => e.stopPropagation()}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-8 py-5 border-b bg-gradient-to-r from-blue-600 to-indigo-500 rounded-t-2xl flex-shrink-0">
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                      <div>
                        <h3 className="text-base font-bold text-white">Order Details</h3>
                        <p className="text-blue-100 text-xs mt-0.5 font-mono">{o.orderNumber}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDetailsDialog({ open: false, order: null })}
                      className="text-white/70 hover:text-white text-2xl leading-none"
                    >
                      &times;
                    </button>
                  </div>

                  {/* Body */}
                  <div id="order-details-print-area" className="overflow-y-auto flex-1 px-8 py-6 space-y-6">

                    {/* Order summary */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-xs text-gray-500 mb-1.5 font-medium uppercase tracking-wide">Status</p>
                        <div>{getStatusBadge(o.status)}</div>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">Order Total</p>
                        <p className="font-bold text-gray-900 text-lg">₹{o.totalAmount.toFixed(2)}</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">Order Date</p>
                        <p className="font-medium text-gray-800">
                          {new Date(o.orderDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </p>
                      </div>
                      {trackingNumber && (
                        <div className="bg-gray-50 rounded-xl p-4">
                          <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">Tracking No</p>
                          <p className="font-medium text-gray-800 text-xs font-mono break-all">{trackingNumber}</p>
                        </div>
                      )}
                    </div>

                    {/* Shipping address */}
                    {addressLine && (
                      <div>
                        <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Shipping Address</p>
                        <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 leading-relaxed">
                          {addr?.name && <p className="font-semibold text-gray-900">{addr.name}</p>}
                          <p>{addressLine}</p>
                        </div>
                      </div>
                    )}

                    {/* Products */}
                    <div>
                      <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                        Items Ordered ({o.products.length})
                      </p>
                      <ul className="space-y-3">
                        {o.products.map((item, idx) => {
                          let imgSrc = item.mainImagePath || "";
                          if (imgSrc.startsWith("public/")) imgSrc = imgSrc.replace(/^public\//, "/");
                          return (
                            <li key={item.orderItemId || `${item.productId}-${idx}`}
                              className="flex items-center gap-4 rounded-xl border border-gray-100 p-4 bg-white shadow-sm"
                            >
                              {imgSrc ? (
                                <img src={imgSrc} alt={item.title}
                                  className="w-16 h-16 object-contain rounded-xl border bg-gray-50 flex-shrink-0" />
                              ) : (
                                <div className="w-16 h-16 rounded-xl border bg-gray-100 flex-shrink-0 flex items-center justify-center text-gray-300 text-2xl">
                                  📦
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">{item.title}</p>
                                {item.variantName && (
                                  <p className="text-xs text-gray-500">{item.variantName}</p>
                                )}
                                <p className="text-xs text-gray-500 mt-0.5">Qty: {item.quantity}</p>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="px-8 py-5 border-t bg-gray-50 flex justify-between items-center flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const printContent = document.getElementById("order-details-print-area");
                        if (!printContent) return;
                        const win = window.open("", "_blank", "width=700,height=900");
                        if (!win) return;
                        win.document.write(`
                          <html>
                            <head>
                              <title>Order Details - ${o.orderNumber}</title>
                              <style>
                                @page { size: auto; margin: 10mm; }
                                @page :first { margin-top: 0; }
                                html { margin: 0; }
                                body { font-family: sans-serif; font-size: 13px; padding: 24px; color: #111; }
                                h2 { font-size: 16px; margin-bottom: 4px; }
                                p { margin: 2px 0; }
                                .label { color: #666; font-size: 11px; }
                                .section { margin-bottom: 16px; border-bottom: 1px solid #eee; padding-bottom: 12px; }
                                .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
                                .item { display: flex; gap: 10px; align-items: flex-start; margin-bottom: 10px; }
                                img { width: 50px; height: 50px; object-fit: contain; border: 1px solid #ddd; border-radius: 4px; }
                                @media print {
                                  body { padding: 0; }
                                  a[href]::after { content: none !important; }
                                }
                              </style>
                            </head>
                            <body>${printContent.innerHTML}</body>
                          </html>
                        `);
                        win.document.close();
                        win.focus();
                        setTimeout(() => { win.print(); win.close(); }, 500);
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6v-8z" />
                      </svg>
                      Print
                    </button>
                    <button
                      type="button"
                      onClick={() => setDetailsDialog({ open: false, order: null })}
                      className="px-5 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
    </div>
  );
};

export default OrderHistoryPage;
