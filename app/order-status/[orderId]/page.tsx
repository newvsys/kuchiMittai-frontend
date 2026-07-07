"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import apiClient from "@/lib/api";
import Link from "next/link";
import { API_BASE } from "@/lib/env";

const showToast = async (msg: string, type: "success" | "error" = "error") => {
  const { default: toast } = await import("react-hot-toast");
  type === "success" ? toast.success(msg) : toast.error(msg);
};

// ── Order status steps ────────────────────────────────────────────────────────
const ORDER_STEPS = ["Order Placed", "Confirmed", "Shipped", "Out for Delivery", "Delivered"];

const STATUS_STEP_MAP: Record<string, number> = {
  P: 0,          // Pending
  PENDING: 0,
  C: 1,          // Confirmed
  CONFIRMED: 1,
  PROCESSING: 1,
  S: 2,          // Shipped
  SHIPPED: 2,
  "IN TRANSIT": 2,
  "IN_TRANSIT": 2,
  O: 3,          // Out for Delivery
  "OUT FOR DELIVERY": 3,
  "OUT_FOR_DELIVERY": 3,
  D: 4,          // Delivered
  DELIVERED: 4,
};

const getStepIndex = (status: string): number =>
  STATUS_STEP_MAP[status?.toUpperCase?.()] ?? STATUS_STEP_MAP[status] ?? 0;

const isCancelledOrFailed = (status: string) =>
  ["CANCELLED", "CANCELED", "X", "FAILED", "REJECTED"].includes(status?.toUpperCase?.() ?? "");

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (dt?: string) =>
  dt ? new Date(dt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : null;

const StatusBadge = ({ status }: { status: string }) => {
  return <span className="text-sm font-semibold text-gray-800">{status}</span>;
};

// ── Component ─────────────────────────────────────────────────────────────────
const OrderStatusPage = () => {
  const router = useRouter();
  const params = useParams();
  const orderId = params?.orderId || params?.id || "";
  const [order, setOrder] = useState<any>(null);
  const [shipment, setShipment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [trackLoading, setTrackLoading] = useState(false);

  useEffect(() => {
    if (!orderId) {
      showToast("Order ID missing");
      router.push("/");
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await apiClient.get(`/api/orderStatus/${orderId}`);
        if (controller.signal.aborted) return;
        if (res.ok) {
          const data = await res.json();
          setOrder(data);

          // Optionally fetch live shipment tracking if AWB is present
          const awb = data?.awbCode;
          if (awb) {
            setTrackLoading(true);
            try {
              const tRes = await fetch(`${API_BASE}/api/shipping/track-shipment/${awb}`, { signal: controller.signal });
              if (!controller.signal.aborted && tRes.ok) {
                const tData = await tRes.json();
                if (tData?.responseStatus === "SUCCESS") setShipment(tData);
              }
            } catch {
              // tracking is non-critical
            } finally {
              setTrackLoading(false);
            }
          }
        } else {
          showToast("Order not found");
          router.push("/");
        }
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        showToast("Failed to fetch order");
        router.push("/");
      } finally {
        setLoading(false);
      }
    }, 0);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [orderId, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-6 px-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* breadcrumb skeleton */}
          <div className="flex gap-2 mb-3">
            <div className="h-3 w-10 bg-gray-200 rounded animate-pulse" />
            <div className="h-3 w-3 bg-gray-200 rounded animate-pulse" />
            <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
            <div className="h-3 w-3 bg-gray-200 rounded animate-pulse" />
            <div className="h-3 w-32 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
            {/* status banner */}
            <div className="rounded-xl px-5 py-4 bg-gray-100 animate-pulse h-16" />
            {/* stepper */}
            <div className="rounded-xl border border-gray-200 px-4 py-5">
              <div className="flex justify-between gap-2">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
                    <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
                    <div className="h-2 w-10 bg-gray-200 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
            {/* info table */}
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="h-10 bg-gray-100 animate-pulse" />
              {[1,2,3,4].map(i => (
                <div key={i} className="flex gap-4 px-5 py-3 border-t border-gray-100">
                  <div className="h-3 w-1/3 bg-gray-200 rounded animate-pulse" />
                  <div className="h-3 w-1/2 bg-gray-200 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (!order) return null;

  const orderStatus: string = order.status || order.orderStatus || "P";
  const cancelled = isCancelledOrFailed(orderStatus);
  const paymentPaid = order.paymentStatus === "PAID";
  const trackHistory: any[] = shipment?.trackingHistory ?? [];

  // Use API-provided fields directly
  const addressDisplay = order.deliveryAddressSummary ||
    [order.address1, order.address2, order.city, order.state, order.postalCode].filter(Boolean).join(", ");
  const estimatedDelivery = order.estimatedDelivery ?? null;  // already formatted string from API
  const trackUrl = order.trackOrderUrl || (shipment?.trackUrl) || null;
  const awb = order.awbCode || shipment?.awbCode || null;
  const dateTime = fmt(order.paymentTime || order.orderDate);

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-4xl mx-auto mb-5">
        <nav className="flex items-center gap-2 text-xl font-medium mb-3">
          <a href="/search?categoryId=0&price=10000&minPrice=0" className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 9.75L12 3l9 6.75V21a.75.75 0 01-.75.75H15.75a.75.75 0 01-.75-.75v-4.5h-6V21a.75.75 0 01-.75.75H3.75A.75.75 0 013 21V9.75z"/></svg>
            Home
          </a>
          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
          <a href="/order-history" className="text-blue-600 hover:text-blue-800 transition-colors">My Orders</a>
          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
          <span className="text-gray-800 font-semibold truncate max-w-[220px]">{String(orderId)}</span>
        </nav>
      </div>
      <div id="order-status-print-area" className="max-w-4xl mx-auto space-y-4 bg-white border border-gray-200 rounded-2xl p-5">

        <div className={`no-print rounded-xl px-5 py-4 text-center border ${paymentPaid && !cancelled ? "bg-green-50 border-green-200" : cancelled ? "bg-red-50 border-red-200" : "bg-yellow-50 border-yellow-200"}`}>
          <h2 className={`text-base font-bold ${paymentPaid && !cancelled ? "text-green-700" : cancelled ? "text-red-700" : "text-yellow-700"}`}>
            {cancelled ? "Order Cancelled / Failed" : paymentPaid ? "Payment Successful" : "Payment Pending"}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">{cancelled ? "This order has been cancelled." : paymentPaid ? "Your order has been received and is being processed." : "Awaiting payment confirmation."}</p>
        </div>

        {/* ── Order progress stepper ── */}
        {!cancelled && (
          <div className="no-print bg-white rounded-xl border border-gray-200 px-4 py-5">
            <div className="flex items-start justify-between relative">
              <div className="absolute top-4 left-[10%] right-[10%] h-0.5 bg-gray-200 z-0" />
              {ORDER_STEPS.map((step, idx) => {
                const stepIndex = getStepIndex(orderStatus);
                const done = idx < stepIndex;
                const active = idx === stepIndex;
                return (
                  <div key={step} className="flex flex-col items-center gap-1.5 z-10 flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                      done ? "bg-blue-500 border-blue-500 text-white" :
                      active ? "bg-white border-blue-500 text-blue-600" :
                      "bg-white border-gray-300 text-gray-400"
                    }`}>
                      {done ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                      ) : idx + 1}
                    </div>
                    <span className={`text-[10px] text-center leading-tight max-w-[56px] ${
                      active ? "text-blue-600 font-semibold" : done ? "text-blue-400" : "text-gray-400"
                    }`}>{step}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Payment / Order info ── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 bg-gray-100 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-700">Payment &amp; Order Info</h2>
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="px-5 py-3 text-gray-500 font-medium w-2/5">Status</td>
                <td className="px-5 py-3">
                  <StatusBadge status={orderStatus} />
                </td>
              </tr>
              <tr>
                <td className="px-5 py-3 text-gray-500 font-medium">Order ID</td>
                <td className="px-5 py-3 font-mono text-gray-800 text-xs">{order.orderNumber || order.id}</td>
              </tr>
              {order.transactionId && (
                <tr>
                  <td className="px-5 py-3 text-gray-500 font-medium">Transaction ID</td>
                  <td className="px-5 py-3 font-mono text-gray-800 text-xs">{order.transactionId}</td>
                </tr>
              )}
              <tr>
                <td className="px-5 py-3 text-gray-500 font-medium">Amount Paid</td>
                <td className="px-5 py-3 font-semibold text-gray-900">₹{Number(order.total ?? order.totalAmount).toFixed(2)}</td>
              </tr>
              {(order.paymentMethod) && (
                <tr>
                  <td className="px-5 py-3 text-gray-500 font-medium">Payment Method</td>
                  <td className="px-5 py-3 text-gray-800">{order.paymentMethod}</td>
                </tr>
              )}
              {dateTime && (
                <tr>
                  <td className="px-5 py-3 text-gray-500 font-medium">Date &amp; Time</td>
                  <td className="px-5 py-3 text-gray-800">{dateTime}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Order / Delivery info ── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 bg-gray-100 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-700">Order / Delivery Info</h2>
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="px-5 py-3 text-gray-500 font-medium w-2/5 align-top">Items Ordered</td>
                <td className="px-5 py-3 text-gray-800">
                  {order.products?.length > 0 ? (
                    <ul className="space-y-0.5">
                      {order.products.map((item: any, idx: number) => (
                        <li key={item.productId || idx}>
                          {item.title || item.name || `Item ${idx + 1}`}
                          <span className="text-gray-400 ml-1">×{item.quantity}</span>
                        </li>
                      ))}
                    </ul>
                  ) : <span className="text-gray-400">—</span>}
                </td>
              </tr>
              <tr>
                <td className="px-5 py-3 text-gray-500 font-medium align-top">Delivery Address</td>
                <td className="px-5 py-3 text-gray-800">{addressDisplay || "—"}</td>
              </tr>
              {estimatedDelivery && (
                <tr>
                  <td className="px-5 py-3 text-gray-500 font-medium">Estimated Delivery</td>
                  <td className="px-5 py-3 text-gray-800">{estimatedDelivery}</td>
                </tr>
              )}
              {shipment?.deliveredDate && (
                <tr>
                  <td className="px-5 py-3 text-gray-500 font-medium">Delivered On</td>
                  <td className="px-5 py-3 text-green-700 font-medium">{fmt(shipment.deliveredDate)}</td>
                </tr>
              )}
              {shipment?.courierName && (
                <tr>
                  <td className="px-5 py-3 text-gray-500 font-medium">Courier</td>
                  <td className="px-5 py-3 text-gray-800">{shipment.courierName}{awb ? ` · ${awb}` : ""}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Shipment timeline (if available) ── */}
        {trackLoading && (
          <div className="no-print bg-white rounded-xl shadow-sm p-5 text-sm text-center text-gray-400">Loading shipment tracking...</div>
        )}
        {!trackLoading && trackHistory.length > 0 && (
          <div className="no-print bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 bg-gray-100 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-700">Shipment Updates</h2>
            </div>
            <div className="px-5 py-4 relative">
              <div className="absolute left-8 top-4 bottom-4 w-0.5 bg-gray-200" />
              <ul className="space-y-5">
                {trackHistory.map((event: any, idx: number) => (
                  <li key={idx} className="flex gap-4 relative">
                    <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold z-10 ${idx === 0 ? "bg-green-500" : "bg-gray-300"}`}>
                      {idx === 0 ? (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : idx + 1}
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${idx === 0 ? "text-green-700" : "text-gray-700"}`}>{event.status}</p>
                      {event.eventTime && <p className="text-xs text-gray-400 mt-0.5">{fmt(event.eventTime)}</p>}
                      {event.location && <p className="text-xs text-gray-500">{event.location}</p>}
                      {event.remarks && event.remarks !== event.status && <p className="text-xs text-gray-400 italic">{event.remarks}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* ── CTAs ── */}
        <div className="no-print flex gap-3 justify-center flex-wrap pb-4 pt-2">
          {!cancelled && trackUrl && (
            <a
              href={trackUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-blue-600 px-5 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors"
            >
              Track Order
            </a>
          )}
          <button
            type="button"
            onClick={() => {
              const printArea = document.getElementById("order-status-print-area");
              if (!printArea) return;
              const win = window.open("", "_blank", "width=720,height=960");
              if (!win) return;
              win.document.write(`
                <html>
                  <head>
                    <title>Order Details - ${order?.orderNumber || ""}</title>
                    <style>
                      @page { size: A4; margin: 15mm; }
                      * { box-sizing: border-box; }
                      body { font-family: Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #111; margin: 0; padding: 0; }
                      h1 { font-size: 22px; margin: 0 0 4px; }
                      h2 { font-size: 17px; margin: 16px 0 8px; font-weight: 600; color: #333; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
                      h3 { font-size: 15px; margin: 12px 0 6px; font-weight: 600; }
                      p { margin: 4px 0; font-size: 14px; }
                      table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 14px; }
                      td, th { padding: 8px 12px; border-bottom: 1px solid #eee; vertical-align: top; text-align: left; }
                      td:first-child { color: #555; width: 38%; font-weight: 500; }
                      th { background: #f5f5f5; font-weight: 600; font-size: 13px; color: #333; }
                      .section-title { background: #f0f4ff; font-weight: 700; font-size: 13px; padding: 7px 12px; color: #2563eb; letter-spacing: 0.05em; text-transform: uppercase; }
                      .no-print { display: none !important; }
                      .badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 13px; font-weight: 600; }
                      img { max-width: 100%; }
                      @media print { body { padding: 0; } a[href]::after { content: none !important; } }
                    </style>
                  </head>
                  <body>${printArea.innerHTML}</body>
                </html>
              `);
              win.document.close();
              win.focus();
              setTimeout(() => { win.print(); win.close(); }, 500);
            }}
            className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6v-8z" />
            </svg>
            Print
          </button>
          <Link href="/search?categoryId=0&price=10000&minPrice=0" className="rounded-lg border border-blue-500 px-5 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors">
            Continue Shopping
          </Link>
        </div>

      </div>
    </div>
  );
};

export default OrderStatusPage;
