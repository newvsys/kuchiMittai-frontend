"use client";

import React, { useCallback, useEffect, useState } from "react";
import apiClient from "@/lib/api";

export interface OrderDetailsItem {
  orderItemId: number;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  productName: string;
  skuCode: string;
  mrp: number;
  sellingPrice: number;
  discount: number;
  discountPercentage: number;
}

export interface OrderDetails {
  orderId: number;
  orderNumber: string;
  userId: number;
  orderStatus: string;
  paymentStatus: string;
  totalAmount: number;
  shippingCost: number;
  deliveryName: string;
  deliveryPhone: string;
  deliveryEmail: string;
  deliveryAddressLine1: string;
  deliveryAddressLine2: string;
  deliveryLandmark: string;
  deliveryCity: string;
  deliveryState: string;
  deliveryPostalCode: string;
  deliveryCountry: string;
  items: OrderDetailsItem[];
  itemCount: number;
}

function getStatusBadgeClass(status: string): string {
  const s = (status || "").toLowerCase();
  if (s.includes("cancel")) return "badge-error text-white";
  if (s === "delivered" || s.includes("deliver")) return "badge-success text-white";
  if (s.includes("confirm")) return "badge-info text-white";
  if (s.includes("return")) return "badge-warning";
  if (s.includes("pickup") || s.includes("progress")) return "badge-warning";
  return "badge-ghost";
}

function formatMoney(value: number | null | undefined): string {
  if (value == null) return "-";
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildOrderDetailsHtml(d: OrderDetails, docTitle?: string): string {
  const rows = d.items
    .map(
      (it) => `<tr>
        <td>${escapeHtml(it.productName)}</td>
        <td>${escapeHtml(it.skuCode)}</td>
        <td class="r">${it.quantity}</td>
        <td class="r">${formatMoney(it.mrp)}</td>
        <td class="r">${formatMoney(it.sellingPrice)}</td>
        <td class="r">${formatMoney(it.discount)} (${formatMoney(it.discountPercentage)}%)</td>
        <td class="r">${formatMoney(it.totalPrice)}</td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" /><title>${escapeHtml(docTitle ?? `Order ${d.orderNumber}`)}</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #222; padding: 24px; }
  h1 { font-size: 20px; margin: 0 0 16px; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px 16px; font-size: 12px; margin-bottom: 20px; }
  .grid div span { display: block; color: #888; font-size: 10px; text-transform: uppercase; }
  .block-title { font-size: 13px; font-weight: bold; margin: 0 0 8px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
  th { background: #f3f4f6; }
  .r { text-align: right; }
  .totals { margin-top: 16px; font-size: 13px; text-align: right; }
  .totals strong { font-size: 15px; }
</style></head>
<body>
  <h1>Order Details</h1>
  <div class="grid">
    <div><span>Order Number</span>${escapeHtml(d.orderNumber)}</div>
    <div><span>Order Status</span>${escapeHtml(d.orderStatus)}</div>
    <div><span>Payment Status</span>${escapeHtml(d.paymentStatus)}</div>
    <div><span>Delivery Name</span>${escapeHtml(d.deliveryName)}</div>
    <div><span>Delivery Phone</span>${escapeHtml(d.deliveryPhone)}</div>
    <div><span>Delivery Email</span>${escapeHtml(d.deliveryEmail)}</div>
  </div>
  <h2 class="block-title">Delivery Address</h2>
  <div class="grid">
    <div><span>Address Line 1</span>${escapeHtml(d.deliveryAddressLine1) || "-"}</div>
    <div><span>Address Line 2</span>${escapeHtml(d.deliveryAddressLine2) || "-"}</div>
    <div><span>Landmark</span>${escapeHtml(d.deliveryLandmark) || "-"}</div>
    <div><span>City</span>${escapeHtml(d.deliveryCity) || "-"}</div>
    <div><span>State</span>${escapeHtml(d.deliveryState) || "-"}</div>
    <div><span>Postal Code</span>${escapeHtml(d.deliveryPostalCode) || "-"}</div>
    <div><span>Country</span>${escapeHtml(d.deliveryCountry) || "-"}</div>
  </div>
  <table>
    <thead><tr><th>Product</th><th>SKU</th><th class="r">Qty</th><th class="r">MRP</th><th class="r">Selling Price</th><th class="r">Discount</th><th class="r">Total</th></tr></thead>
    <tbody>${rows || `<tr><td colspan="7">No items</td></tr>`}</tbody>
  </table>
  <div class="totals">Shipping: INR ${formatMoney(d.shippingCost)}<br/><strong>Total: INR ${formatMoney(d.totalAmount)}</strong></div>
</body></html>`;
}

// Renders the document in an off-screen iframe and prints it, avoiding popup
// blockers (window.open with "noopener" also returns null, so it can't be used).
export function printOrderDetailsDocument(d: OrderDetails, docTitle?: string) {
  const html = buildOrderDetailsHtml(d, docTitle);
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  // Kept on-screen but visually hidden: zero-sized iframes print blank in Chrome.
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "1px";
  iframe.style.height = "1px";
  iframe.style.opacity = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();

  const run = () => {
    win.focus();
    win.print();
    setTimeout(() => iframe.remove(), 1000);
  };
  if (doc.readyState === "complete") {
    setTimeout(run, 100);
  } else {
    win.addEventListener("load", () => setTimeout(run, 100));
  }
}

export function useOrderDetails(orderNumber: string | null) {
  const [data, setData] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (orderNum: string) => {
    setData(null);
    setError(null);
    setLoading(true);
    try {
      const response = await apiClient.get(
        `/api/order-details/${encodeURIComponent(orderNum)}`
      );
      if (!response.ok) throw new Error("Request failed");
      setData(await response.json());
    } catch {
      setError("Failed to load order details. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!orderNumber) {
      setData(null);
      setError(null);
      return;
    }
    load(orderNumber);
  }, [orderNumber, load]);

  return { data, loading, error };
}

const Field = ({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) => (
  <div>
    <p className="text-xs text-gray-400 uppercase">{label}</p>
    <div className={mono ? "font-mono break-all" : "break-all"}>{value}</div>
  </div>
);

const OrderDetailsView = ({ details }: { details: OrderDetails }) => (
  <>
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-6">
      <Field label="Order Number" value={details.orderNumber} mono />
      <Field
        label="Order Status"
        value={
          <span className={`badge badge-sm ${getStatusBadgeClass(details.orderStatus)}`}>
            {details.orderStatus}
          </span>
        }
      />
      <Field
        label="Payment Status"
        value={
          <span
            className={`badge badge-sm ${
              details.paymentStatus === "PAID"
                ? "badge-success text-white"
                : "badge-warning"
            }`}
          >
            {details.paymentStatus}
          </span>
        }
      />
      <Field label="Delivery Name" value={details.deliveryName || "-"} />
      <Field label="Delivery Phone" value={details.deliveryPhone || "-"} />
      <Field label="Delivery Email" value={details.deliveryEmail || "-"} />
    </div>

    <h3 className="text-sm font-semibold mb-2">Delivery Address</h3>
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-6">
      <Field label="Address Line 1" value={details.deliveryAddressLine1 || "-"} />
      <Field label="Address Line 2" value={details.deliveryAddressLine2 || "-"} />
      <Field label="Landmark" value={details.deliveryLandmark || "-"} />
      <Field label="City" value={details.deliveryCity || "-"} />
      <Field label="State" value={details.deliveryState || "-"} />
      <Field label="Postal Code" value={details.deliveryPostalCode || "-"} />
      <Field label="Country" value={details.deliveryCountry || "-"} />
    </div>

    <div className="overflow-x-auto border rounded-lg">
      <table className="w-full text-xs border-collapse">
        <thead className="bg-gray-100">
          <tr>
            <th className="text-left px-2 py-1.5 font-medium">Product</th>
            <th className="text-left px-2 py-1.5 font-medium">SKU</th>
            <th className="text-right px-2 py-1.5 font-medium">Qty</th>
            <th className="text-right px-2 py-1.5 font-medium">MRP</th>
            <th className="text-right px-2 py-1.5 font-medium">Selling Price</th>
            <th className="text-right px-2 py-1.5 font-medium">Discount</th>
            <th className="text-right px-2 py-1.5 font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {details.items?.length ? (
            details.items.map((it) => (
              <tr key={it.orderItemId} className="border-t">
                <td className="px-2 py-1.5">{it.productName}</td>
                <td className="px-2 py-1.5 font-mono">{it.skuCode}</td>
                <td className="px-2 py-1.5 text-right">{it.quantity}</td>
                <td className="px-2 py-1.5 text-right">{formatMoney(it.mrp)}</td>
                <td className="px-2 py-1.5 text-right">{formatMoney(it.sellingPrice)}</td>
                <td className="px-2 py-1.5 text-right">
                  {formatMoney(it.discount)} ({formatMoney(it.discountPercentage)}%)
                </td>
                <td className="px-2 py-1.5 text-right">{formatMoney(it.totalPrice)}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={7} className="px-2 py-4 text-center text-gray-400">
                No items
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>

    <div className="text-right mt-4 text-sm">
      <p className="text-gray-500">Shipping: INR {formatMoney(details.shippingCost)}</p>
      <p className="font-bold text-base">Total: INR {formatMoney(details.totalAmount)}</p>
    </div>
  </>
);

export default OrderDetailsView;
