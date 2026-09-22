"use client";

import React, { useEffect, useRef, useState } from "react";
import apiClient from "@/lib/api";
import { API_BASE } from "@/lib/env";
import OrderDetailsView, {
  printOrderDetailsDocument,
  useOrderDetails,
} from "./OrderDetailsView";

interface ShipmentHistory {
  status: string;
  location: string | null;
  remarks: string;
  date: string;
}

interface CourierCandidate {
  id: number;
  courierCompanyId: number;
  courierName: string;
  rate: number;
  estimatedDeliveryDays: number;
  rank: number;
  isSelected: boolean;
  awbCode: string | null;
  shippingPrice: number | null;
  createdAt: string;
}

interface Shipment {
  shipmentId: number;
  trackingNumber: string;
  courierName: string | null;
  shipmentType: string | null;
  shipmentStatus: string;
  awb: string | null;
  labelUrl: string | null;
  estimatedDeliveryDate: string | null;
  pickupScheduledDate: string | null;
  trackUrl: string | null;
  shippingPrice: number | null;
  courierCandidates: CourierCandidate[];
  shipmentHistory: ShipmentHistory[];
}

interface Payment {
  paymentMethod: string | null;
  paymentProvider: string | null;
  transactionId: string | null;
  amount: number | null;
  paymentStatus: string | null;
  paymentTime: string | null;
}

interface Order {
  orderId: number;
  orderNumber: string;
  orderStatus: string;
  paymentStatus: string;
  currency: string | null;
  totalAmount: number;
  orderCreatedAt: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shipments: Shipment[];
  payment: Payment | null;
}

interface OrderShipmentListResponse {
  totalCount: number;
  orders: Order[];
}

interface ShiprocketOrderItem {
  name: string;
  sku: string;
  units: string;
  selling_price: string;
}

interface ShiprocketFormState {
  order_id: string;
  order_date: string;
  pickup_location: string;
  billing_customer_name: string;
  billing_address: string;
  billing_city: string;
  billing_pincode: string;
  billing_state: string;
  billing_country: string;
  billing_email: string;
  billing_phone: string;
  shipping_is_billing: boolean;
  payment_method: string;
  sub_total: string;
  length: string;
  breadth: string;
  height: string;
  weight: string;
  order_items: ShiprocketOrderItem[];
}

const emptyShiprocketItem: ShiprocketOrderItem = { name: "", sku: "", units: "1", selling_price: "" };

function toShiprocketOrderDate(dateStr: string | null): string {
  const d = dateStr ? new Date(dateStr) : new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const STATUS_OPTIONS = [
  "Confirmed",
  "delivered",
  "CANCELLED",
  "RETURN_IN_PROGRESS",
  "Return Requested",
  "OUT FOR PICKUP",
  "P",
];

function getStatusBadgeClass(status: string): string {
  const s = (status || "").toLowerCase();
  if (s.includes("cancel")) return "badge-error text-white";
  if (s === "delivered" || s.includes("deliver")) return "badge-success text-white";
  if (s.includes("confirm")) return "badge-info text-white";
  if (s.includes("return")) return "badge-warning";
  if (s.includes("pickup") || s.includes("progress")) return "badge-warning";
  return "badge-ghost";
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const AdminOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOrder, setModalOrder] = useState<Order | null>(null);
  const [trackingModal, setTrackingModal] = useState<{ orderNumber: string; history: ShipmentHistory[] } | null>(null);
  const [paymentModalOrder, setPaymentModalOrder] = useState<Order | null>(null);

  const [orderDetailsNumber, setOrderDetailsNumber] = useState<string | null>(null);
  const {
    data: orderDetails,
    loading: orderDetailsLoading,
    error: orderDetailsError,
  } = useOrderDetails(orderDetailsNumber);

  const [shiprocketModalOrder, setShiprocketModalOrder] = useState<Order | null>(null);
  const [shiprocketForm, setShiprocketForm] = useState<ShiprocketFormState | null>(null);
  const [shiprocketCreating, setShiprocketCreating] = useState(false);
  const [shiprocketError, setShiprocketError] = useState<string | null>(null);

  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const [orderNumber, setOrderNumber] = useState("");
  const [orderCreatedFrom, setOrderCreatedFrom] = useState("");
  const [orderCreatedTo, setOrderCreatedTo] = useState("");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 15;

  // Track which shipmentId is currently being resized
  const [resizingLabel, setResizingLabel] = useState<number | null>(null);

  // Whether the shipments modal is currently refetching the latest data for the open order
  const [modalRefreshing, setModalRefreshing] = useState(false);

  const BASE_URL = API_BASE;

  // Fetches the latest shipment details for a single order (by orderNumber) and
  // updates both the modal and the underlying orders list so the table stays in sync.
  const refreshOrderShipments = async (orderNumber: string) => {
    setModalRefreshing(true);
    try {
      const params = new URLSearchParams();
      params.append("orderNumber", orderNumber);
      const response = await apiClient.get(
        `/api/order-shipment-details?${params.toString()}`
      );
      const data: OrderShipmentListResponse = await response.json();
      const fresh = data?.orders?.find((o) => o.orderNumber === orderNumber);
      if (fresh) {
        setModalOrder(fresh);
        setOrders((prev) =>
          prev.map((o) => (o.orderNumber === orderNumber ? fresh : o))
        );
      }
    } catch {
      // Silently ignore - the modal will keep showing the last known data
    } finally {
      setModalRefreshing(false);
    }
  };

  // Opens the shipments modal immediately with the (possibly stale) cached order,
  // then kicks off a background refresh to pull the latest values (e.g. courier,
  // AWB, status) so the popup always reflects the most recent update.
  const openShipmentsModal = (order: Order) => {
    setModalOrder(order);
    refreshOrderShipments(order.orderNumber);
  };

  const handlePrintLabel = async (shipmentId: number, labelUrl: string) => {
    setResizingLabel(shipmentId);
    try {
      const res = await fetch(`${BASE_URL}/products/labels/resize-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfUrl: labelUrl }),
      });
      const data = await res.json();
      if (data.status === "SUCCESS" && data.pdfUrl) {
        window.open(data.pdfUrl, "_blank", "noopener,noreferrer");
      } else {
        alert(data.message || "Failed to resize label PDF");
      }
    } catch {
      alert("Error contacting label resize service");
    } finally {
      setResizingLabel(null);
    }
  };

  // Derived: client-side status filter applied on top of server-filtered results
  const filteredOrders =
    selectedStatuses.length === 0
      ? orders
      : orders.filter((o) => selectedStatuses.includes(o.orderStatus));

  const totalPages = Math.ceil(filteredOrders.length / PAGE_SIZE);
  const displayedOrders = filteredOrders.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Close status dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        statusDropdownRef.current &&
        !statusDropdownRef.current.contains(e.target as Node)
      ) {
        setStatusDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggleStatus = (s: string) => {
    setSelectedStatuses((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  const fetchOrders = async (overrides?: {
    orderNumber?: string;
    orderCreatedFrom?: string;
    orderCreatedTo?: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      const on = overrides?.orderNumber ?? orderNumber;
      const from = overrides?.orderCreatedFrom ?? orderCreatedFrom;
      const to = overrides?.orderCreatedTo ?? orderCreatedTo;
      // status is handled client-side to support multi-selection
      if (on) params.append("orderNumber", on);
      if (from) params.append("orderCreatedFrom", from);
      if (to) params.append("orderCreatedTo", to);
      const qs = params.toString();
      const endpoint = `/api/order-shipment-details${qs ? `?${qs}` : ""}`;
      const response = await apiClient.get(endpoint);
      const data: OrderShipmentListResponse = await response.json();
      setOrders(data?.orders || []);
      setTotalCount(data?.totalCount || 0);
    } catch {
      setError("Failed to fetch orders. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchOrders();
  };

  const handleReset = () => {
    setSelectedStatuses([]);
    setOrderNumber("");
    setOrderCreatedFrom("");
    setOrderCreatedTo("");
    setPage(0);
    fetchOrders({ orderNumber: "", orderCreatedFrom: "", orderCreatedTo: "" });
  };

  const closeModal = () => setModalOrder(null);

  const closePaymentModal = () => setPaymentModalOrder(null);
  const closeTrackingModal = () => setTrackingModal(null);

  const closeOrderDetailsModal = () => setOrderDetailsNumber(null);

  const handlePrintOrderDetails = () => {
    if (orderDetails) printOrderDetailsDocument(orderDetails);
  };

  // Uses the print dialog's "Save as PDF" destination; the document title
  // becomes the suggested file name.
  const handleDownloadOrderDetails = () => {
    if (orderDetails)
      printOrderDetailsDocument(orderDetails, `order-${orderDetails.orderNumber}`);
  };

  const openShiprocketModal = (order: Order) => {
    setShiprocketError(null);
    setShiprocketModalOrder(order);
    setShiprocketForm({
      order_id: order.orderNumber,
      order_date: toShiprocketOrderDate(order.orderCreatedAt),
      pickup_location: "",
      billing_customer_name: order.customerName || "",
      billing_address: "",
      billing_city: "",
      billing_pincode: "",
      billing_state: "",
      billing_country: "India",
      billing_email: order.customerEmail || "",
      billing_phone: order.customerPhone || "",
      shipping_is_billing: true,
      payment_method: order.paymentStatus === "PAID" ? "Prepaid" : "COD",
      sub_total: String(order.totalAmount ?? ""),
      length: "",
      breadth: "",
      height: "",
      weight: "",
      order_items: [{ ...emptyShiprocketItem }],
    });
  };

  const closeShiprocketModal = () => {
    setShiprocketModalOrder(null);
    setShiprocketForm(null);
    setShiprocketError(null);
  };

  const handleShiprocketFieldChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setShiprocketForm((prev) => {
      if (!prev) return prev;
      if (type === "checkbox") {
        return { ...prev, [name]: (e.target as HTMLInputElement).checked };
      }
      return { ...prev, [name]: value };
    });
  };

  const handleShiprocketItemChange = (
    index: number,
    field: keyof ShiprocketOrderItem,
    value: string
  ) => {
    setShiprocketForm((prev) => {
      if (!prev) return prev;
      const items = prev.order_items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      );
      return { ...prev, order_items: items };
    });
  };

  const addShiprocketItem = () => {
    setShiprocketForm((prev) =>
      prev ? { ...prev, order_items: [...prev.order_items, { ...emptyShiprocketItem }] } : prev
    );
  };

  const removeShiprocketItem = (index: number) => {
    setShiprocketForm((prev) =>
      prev ? { ...prev, order_items: prev.order_items.filter((_, i) => i !== index) } : prev
    );
  };

  const handleCreateShiprocketOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiprocketForm) return;
    setShiprocketError(null);
    setShiprocketCreating(true);
    try {
      const payload = {
        order_id: shiprocketForm.order_id,
        order_date: shiprocketForm.order_date,
        pickup_location: shiprocketForm.pickup_location,
        billing_customer_name: shiprocketForm.billing_customer_name,
        billing_address: shiprocketForm.billing_address,
        billing_city: shiprocketForm.billing_city,
        billing_pincode: shiprocketForm.billing_pincode,
        billing_state: shiprocketForm.billing_state,
        billing_country: shiprocketForm.billing_country,
        billing_email: shiprocketForm.billing_email,
        billing_phone: shiprocketForm.billing_phone,
        shipping_is_billing: shiprocketForm.shipping_is_billing,
        payment_method: shiprocketForm.payment_method,
        sub_total: parseFloat(shiprocketForm.sub_total) || 0,
        length: parseFloat(shiprocketForm.length) || 0,
        breadth: parseFloat(shiprocketForm.breadth) || 0,
        height: parseFloat(shiprocketForm.height) || 0,
        weight: parseFloat(shiprocketForm.weight) || 0,
        order_items: shiprocketForm.order_items.map((item) => ({
          name: item.name,
          sku: item.sku,
          units: parseInt(item.units, 10) || 0,
          selling_price: parseFloat(item.selling_price) || 0,
        })),
      };
      const res = await apiClient.post("/api/shipping/create-order", payload);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "Failed to create Shiprocket order");
      }
      closeShiprocketModal();
      if (shiprocketModalOrder) {
        refreshOrderShipments(shiprocketModalOrder.orderNumber);
      }
    } catch (err: any) {
      setShiprocketError(err.message || "Failed to create Shiprocket order");
    } finally {
      setShiprocketCreating(false);
    }
  };

  return (
    <div className="xl:ml-5 w-full max-xl:mt-5 p-4">
      <h1 className="text-3xl font-semibold text-center mb-6">Orders</h1>

      {/* Tracking History Modal */}
      {trackingModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={closeTrackingModal}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h2 className="text-lg font-bold">Internal Tracking</h2>
                <p className="text-xs text-gray-400 mt-0.5 font-mono break-all">
                  Order #{trackingModal.orderNumber}
                </p>
              </div>
              <button
                className="btn btn-sm btn-ghost btn-circle text-lg"
                onClick={closeTrackingModal}
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto px-6 py-4">
              {trackingModal.history.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No history available.</p>
              ) : (
                <ol className="relative border-l-2 border-green-700 ml-2 space-y-6">
                  {trackingModal.history.map((h, idx) => (
                    <li key={idx} className="ml-6">
                      <span className="absolute -left-3 w-5 h-5 rounded-full bg-green-700 border-2 border-white ring-2 ring-green-700"></span>
                      <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <span className={`badge badge-sm ${getStatusBadgeClass(h.status)}`}>
                          {h.status}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(h.date).toLocaleString("en-IN", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </span>
                      </div>
                      {h.location && (
                        <p className="text-xs text-gray-500">
                          📍 {h.location}
                        </p>
                      )}
                      {h.remarks && (
                        <p className="text-xs text-gray-600 mt-0.5">{h.remarks}</p>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {orderDetailsNumber && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={closeOrderDetailsModal}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h2 className="text-lg font-bold">Order Details</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn btn-sm bg-blue-500 hover:bg-blue-600 text-white border-none"
                  disabled={!orderDetails}
                  onClick={handlePrintOrderDetails}
                >
                  Print
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  disabled={!orderDetails}
                  onClick={handleDownloadOrderDetails}
                >
                  Download PDF
                </button>
                <button
                  className="btn btn-sm btn-ghost btn-circle text-lg"
                  onClick={closeOrderDetailsModal}
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="overflow-y-auto px-6 py-4">
              {orderDetailsLoading ? (
                <div className="flex justify-center py-10">
                  <span className="loading loading-spinner loading-lg"></span>
                </div>
              ) : orderDetailsError ? (
                <div className="alert alert-error">
                  <span>{orderDetailsError}</span>
                </div>
              ) : orderDetails ? (
                <OrderDetailsView details={orderDetails} />
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Shipments Modal */}
      {modalOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h2 className="text-lg font-bold">
                  Shipments &mdash; {modalOrder.orderNumber}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {modalOrder.customerName} &bull; {modalOrder.customerEmail}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn btn-xs btn-ghost"
                  disabled={modalRefreshing}
                  onClick={() => refreshOrderShipments(modalOrder.orderNumber)}
                  title="Refresh with latest shipment data"
                >
                  {modalRefreshing ? "Refreshing…" : "↻ Refresh"}
                </button>
                <button
                  className="btn btn-sm btn-ghost btn-circle text-lg"
                  onClick={closeModal}
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="overflow-y-auto px-6 py-4 space-y-4">
              {modalOrder.shipments.map((shipment) => (
                <div
                  key={shipment.shipmentId}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-400">Tracking #</p>
                      <p className="font-mono text-xs font-semibold break-all">
                        {shipment.trackingNumber}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Courier</p>
                      <p>{shipment.courierName || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Type</p>
                      <p>{shipment.shipmentType || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Status</p>
                      <span
                        className={`badge badge-sm ${getStatusBadgeClass(shipment.shipmentStatus)}`}
                      >
                        {shipment.shipmentStatus}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">AWB</p>
                      <p className="font-mono text-xs">{shipment.awb || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Est. Delivery</p>
                      <p className="text-xs">
                        {formatDate(shipment.estimatedDeliveryDate)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Pickup Scheduled</p>
                      <p className="text-xs">
                        {formatDate(shipment.pickupScheduledDate)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Shipping Price</p>
                      <p className="font-semibold">
                        {shipment.shippingPrice != null ? `₹${shipment.shippingPrice.toFixed(2)}` : "-"}
                      </p>
                    </div>
                    <div className="flex items-end gap-2 flex-wrap">
                      {shipment.trackUrl && (
                        <a
                          href={shipment.trackUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-ghost btn-xs"
                        >
                          Track
                        </a>
                      )}
                      {shipment.labelUrl && (
                        <div className="flex gap-1">
                          <a
                            href={shipment.labelUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-xs bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 whitespace-nowrap"
                          >
                            Print Label
                          </a>
                          <button
                            type="button"
                            disabled={resizingLabel === shipment.shipmentId}
                            onClick={() => handlePrintLabel(shipment.shipmentId, shipment.labelUrl!)}
                            className="btn btn-xs bg-blue-500 hover:bg-blue-600 text-white border-none disabled:opacity-60 whitespace-nowrap"
                          >
                            {resizingLabel === shipment.shipmentId ? "Preparing…" : "Print Resized Label"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Courier Candidates */}
                  {shipment.courierCandidates && shipment.courierCandidates.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Courier Options</p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs border-collapse">
                          <thead>
                            <tr className="bg-gray-50 text-gray-500">
                              <th className="text-left px-2 py-1.5 font-medium">Rank</th>
                              <th className="text-left px-2 py-1.5 font-medium">Courier</th>
                              <th className="text-right px-2 py-1.5 font-medium">Rate</th>
                              <th className="text-right px-2 py-1.5 font-medium">Est. Days</th>
                              <th className="text-left px-2 py-1.5 font-medium">AWB</th>
                              <th className="text-center px-2 py-1.5 font-medium">Selected</th>
                            </tr>
                          </thead>
                          <tbody>
                            {shipment.courierCandidates.map((c) => (
                              <tr
                                key={c.id}
                                className={c.isSelected ? "bg-green-50 font-semibold" : "border-t border-gray-100"}
                              >
                                <td className="px-2 py-1.5">{c.rank}</td>
                                <td className="px-2 py-1.5">{c.courierName}</td>
                                <td className="px-2 py-1.5 text-right">₹{c.rate.toFixed(2)}</td>
                                <td className="px-2 py-1.5 text-right">{c.estimatedDeliveryDays} days</td>
                                <td className="px-2 py-1.5 font-mono">{c.awbCode || "-"}</td>
                                <td className="px-2 py-1.5 text-center">
                                  {c.isSelected ? (
                                    <span className="inline-block w-4 h-4 rounded-full bg-green-500 text-white text-[10px] leading-4 text-center">✓</span>
                                  ) : (
                                    <span className="text-gray-300">—</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Payment Details Modal */}
      {paymentModalOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={closePaymentModal}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h2 className="text-lg font-bold">
                  Payment Details &mdash; {paymentModalOrder.orderNumber}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {paymentModalOrder.customerName} &bull; {paymentModalOrder.customerEmail}
                </p>
              </div>
              <button
                className="btn btn-sm btn-ghost btn-circle text-lg"
                onClick={closePaymentModal}
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto px-6 py-4">
              {paymentModalOrder.payment ? (
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-400">Payment Method</p>
                    <p>{paymentModalOrder.payment.paymentMethod || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Payment Provider</p>
                    <p>{paymentModalOrder.payment.paymentProvider || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Transaction ID</p>
                    <p className="font-mono text-xs break-all">
                      {paymentModalOrder.payment.transactionId || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Amount</p>
                    <p className="font-semibold">
                      {paymentModalOrder.payment.amount != null
                        ? `${paymentModalOrder.currency || "INR"} ${paymentModalOrder.payment.amount.toLocaleString("en-IN")}`
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Payment Status</p>
                    <span
                      className={`badge badge-sm ${
                        paymentModalOrder.payment.paymentStatus === "PAID"
                          ? "badge-success text-white"
                          : "badge-warning"
                      }`}
                    >
                      {paymentModalOrder.payment.paymentStatus || "-"}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Payment Time</p>
                    <p className="text-xs">
                      {paymentModalOrder.payment.paymentTime
                        ? new Date(paymentModalOrder.payment.paymentTime).toLocaleString("en-IN")
                        : "-"}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400">No payment record found for this order.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Shiprocket Order Modal */}
      {shiprocketModalOrder && shiprocketForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={closeShiprocketModal}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h2 className="text-lg font-bold">
                  Create Shiprocket Order &mdash; {shiprocketModalOrder.orderNumber}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {shiprocketModalOrder.customerName} &bull; {shiprocketModalOrder.customerEmail}
                </p>
              </div>
              <button
                className="btn btn-sm btn-ghost btn-circle text-lg"
                onClick={closeShiprocketModal}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateShiprocketOrder} className="overflow-y-auto px-6 py-4 space-y-4">
              {shiprocketError && (
                <div className="alert alert-error text-sm py-2">
                  <span>{shiprocketError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Order ID</label>
                  <input
                    name="order_id"
                    value={shiprocketForm.order_id}
                    onChange={handleShiprocketFieldChange}
                    required
                    className="input input-bordered input-sm w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Order Date</label>
                  <input
                    name="order_date"
                    value={shiprocketForm.order_date}
                    onChange={handleShiprocketFieldChange}
                    placeholder="yyyy-MM-dd HH:mm"
                    required
                    className="input input-bordered input-sm w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Pickup Location</label>
                  <input
                    name="pickup_location"
                    value={shiprocketForm.pickup_location}
                    onChange={handleShiprocketFieldChange}
                    required
                    className="input input-bordered input-sm w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Payment Method</label>
                  <select
                    name="payment_method"
                    value={shiprocketForm.payment_method}
                    onChange={handleShiprocketFieldChange}
                    className="select select-bordered select-sm w-full"
                  >
                    <option value="Prepaid">Prepaid</option>
                    <option value="COD">COD</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Sub Total</label>
                  <input
                    type="number"
                    name="sub_total"
                    value={shiprocketForm.sub_total}
                    onChange={handleShiprocketFieldChange}
                    min="0"
                    step="0.01"
                    required
                    className="input input-bordered input-sm w-full"
                  />
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    name="shipping_is_billing"
                    checked={shiprocketForm.shipping_is_billing}
                    onChange={handleShiprocketFieldChange}
                    className="checkbox checkbox-sm"
                    id="shipping_is_billing"
                  />
                  <label htmlFor="shipping_is_billing" className="text-xs text-gray-600">
                    Shipping same as billing
                  </label>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Billing Details</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Customer Name</label>
                    <input
                      name="billing_customer_name"
                      value={shiprocketForm.billing_customer_name}
                      onChange={handleShiprocketFieldChange}
                      required
                      className="input input-bordered input-sm w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Email</label>
                    <input
                      type="email"
                      name="billing_email"
                      value={shiprocketForm.billing_email}
                      onChange={handleShiprocketFieldChange}
                      required
                      className="input input-bordered input-sm w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Phone</label>
                    <input
                      name="billing_phone"
                      value={shiprocketForm.billing_phone}
                      onChange={handleShiprocketFieldChange}
                      required
                      className="input input-bordered input-sm w-full"
                    />
                  </div>
                  <div className="col-span-2 md:col-span-3">
                    <label className="block text-xs text-gray-500 mb-1">Address</label>
                    <input
                      name="billing_address"
                      value={shiprocketForm.billing_address}
                      onChange={handleShiprocketFieldChange}
                      required
                      className="input input-bordered input-sm w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">City</label>
                    <input
                      name="billing_city"
                      value={shiprocketForm.billing_city}
                      onChange={handleShiprocketFieldChange}
                      required
                      className="input input-bordered input-sm w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">State</label>
                    <input
                      name="billing_state"
                      value={shiprocketForm.billing_state}
                      onChange={handleShiprocketFieldChange}
                      required
                      className="input input-bordered input-sm w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Pincode</label>
                    <input
                      name="billing_pincode"
                      value={shiprocketForm.billing_pincode}
                      onChange={handleShiprocketFieldChange}
                      required
                      className="input input-bordered input-sm w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Country</label>
                    <input
                      name="billing_country"
                      value={shiprocketForm.billing_country}
                      onChange={handleShiprocketFieldChange}
                      required
                      className="input input-bordered input-sm w-full"
                    />
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Package Dimensions</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Length (cm)</label>
                    <input
                      type="number"
                      name="length"
                      value={shiprocketForm.length}
                      onChange={handleShiprocketFieldChange}
                      min="0"
                      step="0.1"
                      required
                      className="input input-bordered input-sm w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Breadth (cm)</label>
                    <input
                      type="number"
                      name="breadth"
                      value={shiprocketForm.breadth}
                      onChange={handleShiprocketFieldChange}
                      min="0"
                      step="0.1"
                      required
                      className="input input-bordered input-sm w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Height (cm)</label>
                    <input
                      type="number"
                      name="height"
                      value={shiprocketForm.height}
                      onChange={handleShiprocketFieldChange}
                      min="0"
                      step="0.1"
                      required
                      className="input input-bordered input-sm w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Weight (kg)</label>
                    <input
                      type="number"
                      name="weight"
                      value={shiprocketForm.weight}
                      onChange={handleShiprocketFieldChange}
                      min="0"
                      step="0.01"
                      required
                      className="input input-bordered input-sm w-full"
                    />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Order Items</p>
                  <button
                    type="button"
                    onClick={addShiprocketItem}
                    className="btn btn-xs btn-ghost"
                  >
                    + Add Item
                  </button>
                </div>
                <div className="space-y-2">
                  {shiprocketForm.order_items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <input
                        placeholder="Name"
                        value={item.name}
                        onChange={(e) => handleShiprocketItemChange(idx, "name", e.target.value)}
                        required
                        className="input input-bordered input-sm col-span-4"
                      />
                      <input
                        placeholder="SKU"
                        value={item.sku}
                        onChange={(e) => handleShiprocketItemChange(idx, "sku", e.target.value)}
                        required
                        className="input input-bordered input-sm col-span-3"
                      />
                      <input
                        type="number"
                        placeholder="Units"
                        value={item.units}
                        onChange={(e) => handleShiprocketItemChange(idx, "units", e.target.value)}
                        min="1"
                        required
                        className="input input-bordered input-sm col-span-2"
                      />
                      <input
                        type="number"
                        placeholder="Price"
                        value={item.selling_price}
                        onChange={(e) => handleShiprocketItemChange(idx, "selling_price", e.target.value)}
                        min="0"
                        step="0.01"
                        required
                        className="input input-bordered input-sm col-span-2"
                      />
                      <button
                        type="button"
                        onClick={() => removeShiprocketItem(idx)}
                        disabled={shiprocketForm.order_items.length === 1}
                        className="btn btn-xs btn-ghost col-span-1 disabled:opacity-40"
                        title="Remove item"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={closeShiprocketModal}
                  disabled={shiprocketCreating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={shiprocketCreating}
                >
                  {shiprocketCreating ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filters */}
      <form
        onSubmit={handleSearch}
        className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6"
      >
        <div className="flex flex-wrap items-end gap-3">
          <div ref={statusDropdownRef} className="relative w-64">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <button
              type="button"
              onClick={() => setStatusDropdownOpen((o) => !o)}
              className="input input-bordered input-sm w-full flex items-center justify-between text-left"
            >
              <span className="truncate text-sm">
                {selectedStatuses.length === 0
                  ? "All Statuses"
                  : selectedStatuses.length === 1
                  ? selectedStatuses[0]
                  : `${selectedStatuses.length} selected`}
              </span>
              <svg
                className={`w-4 h-4 ml-1 shrink-0 transition-transform ${
                  statusDropdownOpen ? "rotate-180" : ""
                }`}
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            {statusDropdownOpen && (
              <div className="absolute z-50 mt-1 w-full min-w-[180px] bg-white border border-gray-200 rounded-lg shadow-lg py-1">
                <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm"
                    checked={selectedStatuses.length === 0}
                    onChange={() => setSelectedStatuses([])}
                  />
                  <span className="text-sm">All Statuses</span>
                </label>
                <hr className="my-1" />
                {STATUS_OPTIONS.map((s) => (
                  <label
                    key={s}
                    className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm"
                      checked={selectedStatuses.includes(s)}
                      onChange={() => toggleStatus(s)}
                    />
                    <span className="text-sm">{s}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="w-72">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Order Number
            </label>
            <input
              type="text"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="e.g. ORD-260511..."
              className="input input-bordered input-sm w-full"
            />
          </div>
          <div className="w-56">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Created From
            </label>
            <input
              type="date"
              value={orderCreatedFrom}
              onChange={(e) => setOrderCreatedFrom(e.target.value)}
              className="input input-bordered input-sm w-full"
            />
          </div>
          <div className="w-56">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Created To
            </label>
            <input
              type="date"
              value={orderCreatedTo}
              onChange={(e) => setOrderCreatedTo(e.target.value)}
              className="input input-bordered input-sm w-full"
            />
          </div>
          <div className="flex gap-2 pt-5">
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={loading}
            >
              {loading ? "Searching..." : "Search"}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="btn btn-ghost btn-sm"
              disabled={loading}
            >
              Reset
            </button>
          </div>
        </div>
      </form>

      <p className="text-sm text-gray-500 mb-3">
        Total Orders: <span className="font-semibold">{totalCount}</span>
        {selectedStatuses.length > 0 && (
          <span className="ml-2">
            &mdash; Showing{" "}
            <span className="font-semibold">{filteredOrders.length}</span> filtered
          </span>
        )}
      </p>

      {error && (
        <div className="alert alert-error mb-4">
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center my-10">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-sm w-full">
            <thead className="bg-gray-100">
              <tr>
                <th>Order Number</th>
                <th>Customer</th>
                <th>Order Status</th>
                <th>Payment</th>
                <th>Total</th>
                <th>Created At</th>
                <th>Order Details</th>
                <th>Shipments</th>
                <th>Payment Details</th>
                <th>Labels</th>
                <th>Internal Tracking</th>
              </tr>
            </thead>
            <tbody>
              {displayedOrders.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-10 text-gray-400">
                    No orders found.
                  </td>
                </tr>
              ) : (
                displayedOrders.map((order) => (
                  <tr key={order.orderId} className="hover:bg-gray-50 border-b">
                    <td className="font-mono text-xs font-semibold">
                      {order.orderNumber}
                    </td>
                    <td>
                      <div className="font-medium">{order.customerName}</div>
                      <div className="text-xs text-gray-500">
                        {order.customerEmail}
                      </div>
                      <div className="text-xs text-gray-400">
                        {order.customerPhone}
                      </div>
                    </td>
                    <td>
                      <span
                        className={`badge badge-sm ${getStatusBadgeClass(order.orderStatus)}`}
                      >
                        {order.orderStatus}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge badge-sm ${
                          order.paymentStatus === "PAID"
                            ? "badge-success text-white"
                            : "badge-warning"
                        }`}
                      >
                        {order.paymentStatus}
                      </span>
                    </td>
                    <td className="font-semibold whitespace-nowrap">
                      {order.currency || "INR"}{" "}
                      {order.totalAmount?.toLocaleString("en-IN")}
                    </td>
                    <td className="text-sm whitespace-nowrap">
                      {formatDate(order.orderCreatedAt)}
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => setOrderDetailsNumber(order.orderNumber)}
                        className="text-blue-600 hover:underline text-sm font-medium whitespace-nowrap"
                      >
                        View Order Details
                      </button>
                    </td>
                    <td>
                      {order.shipments.length === 0 ? (
                        <span className="text-xs text-gray-400">No shipments</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openShipmentsModal(order)}
                          className="text-blue-600 hover:underline text-sm font-medium"
                        >
                          {order.shipments.length} shipment
                          {order.shipments.length !== 1 ? "s" : ""}
                        </button>
                      )}
                    </td>
                    <td>
                      {order.payment ? (
                        <button
                          type="button"
                          onClick={() => setPaymentModalOrder(order)}
                          className="text-blue-600 hover:underline text-sm font-medium"
                        >
                          View Details
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">No payment</span>
                      )}
                    </td>
                    <td>
                      {(() => {
                        const forwardLabels = order.shipments.filter(
                          (s) => s.shipmentType === "FORWARD" && s.labelUrl
                        );
                        if (forwardLabels.length === 0)
                          return <span className="text-xs text-gray-400">—</span>;
                        return (
                          <div className="flex flex-col gap-1">
                            {forwardLabels.map((s) => (
                              <div key={s.shipmentId} className="flex gap-1">
                                <a
                                  href={s.labelUrl!}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-xs bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 whitespace-nowrap"
                                >
                                  Print Label
                                </a>
                                <button
                                  type="button"
                                  disabled={resizingLabel === s.shipmentId}
                                  onClick={() => handlePrintLabel(s.shipmentId, s.labelUrl!)}
                                  className="btn btn-xs bg-blue-500 hover:bg-blue-600 text-white border-none whitespace-nowrap disabled:opacity-60"
                                >
                                  {resizingLabel === s.shipmentId ? "Preparing…" : "Print Resized Label"}
                                </button>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </td>
                    <td>
                      {(() => {
                        const merged = order.shipments
                          .flatMap((s) => s.shipmentHistory ?? [])
                          .sort(
                            (a, b) =>
                              new Date(a.date).getTime() - new Date(b.date).getTime()
                          );
                        if (merged.length === 0)
                          return <span className="text-xs text-gray-400">—</span>;
                        return (
                          <button
                            type="button"
                            onClick={() =>
                              setTrackingModal({
                                orderNumber: order.orderNumber,
                                history: merged,
                              })
                            }
                            className="btn btn-outline btn-xs whitespace-nowrap"
                          >
                            Track Order Status
                          </button>
                        );
                      })()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">
            Page <span className="font-semibold">{page + 1}</span> of{" "}
            <span className="font-semibold">{totalPages}</span>
            {" "}&mdash; records {page * PAGE_SIZE + 1}&ndash;{Math.min((page + 1) * PAGE_SIZE, filteredOrders.length)} of{" "}
            {filteredOrders.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => setPage(0)}
              disabled={page === 0}
            >
              &laquo;
            </button>
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              &lsaquo;
            </button>
            {Array.from({ length: totalPages }, (_, i) => i)
              .filter((i) => Math.abs(i - page) <= 2)
              .map((i) => (
                <button
                  key={i}
                  className={`btn btn-sm ${
                    i === page ? "btn-primary" : "btn-ghost"
                  }`}
                  onClick={() => setPage(i)}
                >
                  {i + 1}
                </button>
              ))}
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
            >
              &rsaquo;
            </button>
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => setPage(totalPages - 1)}
              disabled={page === totalPages - 1}
            >
              &raquo;
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrders;
