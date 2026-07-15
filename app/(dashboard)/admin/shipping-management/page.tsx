"use client";

import { DashboardSidebar } from "@/components";
import React, { useEffect, useRef, useState } from "react";
import { showToast, showError } from "@/lib/toast";
import apiClient from "@/lib/api";

// â”€â”€â”€ Pending Orders Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface PendingShipment {
  shipmentId: number;
  awb: string | null;
  labelUrl: string | null;
  shipmentStatus: string;
  shipmentType: string | null;
}

interface PendingOrder {
  orderId: number;
  orderNumber: string;
  orderStatus: string;
  paymentStatus: string;
  totalAmount: number;
  currency: string | null;
  orderCreatedAt: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shipments: PendingShipment[];
}

interface OrderListResponse {
  totalCount: number;
  orders: PendingOrder[];
}

const ORDER_STATUS_OPTIONS = [
  "Confirmed",
  "delivered",
  "CANCELLED",
  "RETURN_IN_PROGRESS",
  "Return Requested",
  "OUT FOR PICKUP",
  "P",
];

function getStatusBadge(status: string) {
  const s = (status || "").toLowerCase();
  if (s.includes("cancel")) return "bg-red-100 text-red-700";
  if (s === "delivered" || s.includes("deliver")) return "bg-green-100 text-green-700";
  if (s.includes("confirm")) return "bg-blue-100 text-blue-700";
  if (s.includes("return")) return "bg-yellow-100 text-yellow-700";
  return "bg-gray-100 text-gray-600";
}

function formatDate(d: string | null) {
  if (!d) return "â€”";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface Warehouse {
  warehouseId: number;
  warehouseName: string;
  warehouseCode: string;
  status: string;
}

interface TrackingHistory {
  status: string;
  location: string;
  remarks: string;
  date: string;
}

interface ShippingRecord {
  shipmentId: number;
  orderNumber: string;
  orderId: number;
  shiprocketOrderId: number | null;
  shiprocketShipmentId: number | null;
  awbCode: string | null;
  courierName: string | null;
  courierCompanyId: number | null;
  shipmentStatus: string;
  shipmentType: string;
  trackingNumber: string | null;
  length: number | null;
  breadth: number | null;
  height: number | null;
  weight: number | null;
  shippingPrice: number | null;
  labelUrl: string | null;
  trackUrl: string | null;
  warehouseId: number | null;
  warehouseName: string | null;
  pickupScheduledDate: string | null;
  estimatedDeliveryDate: string | null;
  expectedDeliveryDate: string | null;
  shippedDate: string | null;
  deliveredDate: string | null;
  pickupId: number | null;
  pickupToken: string | null;
  createdAt: string;
  updatedAt: string;
  trackingHistory: TrackingHistory[];
}

interface ShippingForm {
  warehouseId: string;
  shiprocketOrderId: string;
  shiprocketShipmentId: string;
  awbCode: string;
  courierName: string;
  courierCompanyId: string;
  shipmentStatus: string;
  shipmentType: string;
  trackingNumber: string;
  length: string;
  breadth: string;
  height: string;
  weight: string;
  shippingPrice: string;
  labelUrl: string;
  trackUrl: string;
  estimatedDeliveryDate: string;
  expectedDeliveryDate: string;
  historyStatus: string;
  historyLocation: string;
  historyRemarks: string;
  notes: string;
}

// â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const SHIPMENT_STATUS_OPTIONS = [
  "CREATED",
  "PICKUP_SCHEDULED",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
  "RETURN_REQUESTED",
  "RETURN_PICKUP_INITIATED",
  "RECEIVED",
];

const SHIPMENT_TYPE_OPTIONS = ["FORWARD", "RETURN_PICKUP"];

const emptyForm: ShippingForm = {
  warehouseId: "",
  shiprocketOrderId: "",
  shiprocketShipmentId: "",
  awbCode: "",
  courierName: "",
  courierCompanyId: "",
  shipmentStatus: "CREATED",
  shipmentType: "FORWARD",
  trackingNumber: "",
  length: "",
  breadth: "",
  height: "",
  weight: "",
  shippingPrice: "",
  labelUrl: "",
  trackUrl: "",
  estimatedDeliveryDate: "",
  expectedDeliveryDate: "",
  historyStatus: "",
  historyLocation: "",
  historyRemarks: "",
  notes: "",
};

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const statusBadgeClass = (status: string) => {
  switch (status?.toUpperCase()) {
    case "DELIVERED":              return "bg-green-100 text-green-800";
    case "IN_TRANSIT":             return "bg-blue-100 text-blue-800";
    case "OUT_FOR_DELIVERY":       return "bg-indigo-100 text-indigo-800";
    case "PICKUP_SCHEDULED":       return "bg-purple-100 text-purple-800";
    case "RECEIVED":               return "bg-teal-100 text-teal-800";
    case "RETURN_PICKUP_INITIATED": return "bg-orange-100 text-orange-800";
    case "RETURN_REQUESTED":       return "bg-yellow-100 text-yellow-800";
    case "FAILED":
    case "CANCELLED":              return "bg-red-100 text-red-800";
    case "CREATED":
    default:                       return "bg-gray-100 text-gray-700";
  }
};

const recordToForm = (r: ShippingRecord): ShippingForm => ({
  warehouseId:           r.warehouseId != null ? String(r.warehouseId) : "",
  shiprocketOrderId:     r.shiprocketOrderId != null ? String(r.shiprocketOrderId) : "",
  shiprocketShipmentId:  r.shiprocketShipmentId != null ? String(r.shiprocketShipmentId) : "",
  awbCode:               r.awbCode ?? "",
  courierName:           r.courierName ?? "",
  courierCompanyId:      r.courierCompanyId != null ? String(r.courierCompanyId) : "",
  shipmentStatus:        r.shipmentStatus ?? "CREATED",
  shipmentType:          r.shipmentType ?? "FORWARD",
  trackingNumber:        r.trackingNumber ?? "",
  length:                r.length != null ? String(r.length) : "",
  breadth:               r.breadth != null ? String(r.breadth) : "",
  height:                r.height != null ? String(r.height) : "",
  weight:                r.weight != null ? String(r.weight) : "",
  shippingPrice:         r.shippingPrice != null ? String(r.shippingPrice) : "",
  labelUrl:              r.labelUrl ?? "",
  trackUrl:              r.trackUrl ?? "",
  estimatedDeliveryDate: r.estimatedDeliveryDate ? r.estimatedDeliveryDate.slice(0, 10) : "",
  expectedDeliveryDate:  r.expectedDeliveryDate ? r.expectedDeliveryDate.slice(0, 10) : "",
  historyStatus:         "",
  historyLocation:       "",
  historyRemarks:        "",
  notes:                 "",
});

/** Builds the request payload, omitting blank string fields. */
const buildPayload = (form: ShippingForm) => {
  const payload: Record<string, unknown> = {};
  const num = (v: string) => (v.trim() !== "" ? parseFloat(v) : undefined);
  const int = (v: string) => (v.trim() !== "" ? parseInt(v, 10) : undefined);
  const str = (v: string) => (v.trim() !== "" ? v.trim() : undefined);

  const set = (key: string, val: unknown) => { if (val !== undefined) payload[key] = val; };

  set("warehouseId",           int(form.warehouseId));
  set("shiprocketOrderId",     int(form.shiprocketOrderId));
  set("shiprocketShipmentId",  int(form.shiprocketShipmentId));
  set("awbCode",               str(form.awbCode));
  set("courierName",           str(form.courierName));
  set("courierCompanyId",      int(form.courierCompanyId));
  set("shipmentStatus",        str(form.shipmentStatus));
  set("shipmentType",          str(form.shipmentType));
  set("trackingNumber",        str(form.trackingNumber));
  set("length",                num(form.length));
  set("breadth",               num(form.breadth));
  set("height",                num(form.height));
  set("weight",                num(form.weight));
  set("shippingPrice",         num(form.shippingPrice));
  set("labelUrl",              str(form.labelUrl));
  set("trackUrl",              str(form.trackUrl));
  set("estimatedDeliveryDate", str(form.estimatedDeliveryDate));
  set("expectedDeliveryDate",  str(form.expectedDeliveryDate));
  set("historyStatus",         str(form.historyStatus));
  set("historyLocation",       str(form.historyLocation));
  set("historyRemarks",        str(form.historyRemarks));
  set("notes",                 str(form.notes));

  return payload;
};

// â”€â”€â”€ Sub-components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const Field = ({
  label, name, type = "text", value, onChange, placeholder, required, hint,
}: {
  label: string; name: string; type?: string; value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  placeholder?: string; required?: boolean; hint?: string;
}) => (
  <div>
    <label className="block text-xs font-medium text-gray-600 mb-1">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      {hint && <span className="text-gray-400 font-normal ml-1">({hint})</span>}
    </label>
    <input
      type={type} name={name} value={value} onChange={onChange}
      placeholder={placeholder}
      className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
    />
  </div>
);

const SelectField = ({
  label, name, value, onChange, options, required,
}: {
  label: string; name: string; value: string;
  onChange: React.ChangeEventHandler<HTMLSelectElement>;
  options: string[]; required?: boolean;
}) => (
  <div>
    <label className="block text-xs font-medium text-gray-600 mb-1">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    <select
      name={name} value={value} onChange={onChange}
      className="w-full border rounded px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
    >
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-xs font-semibold text-blue-700 uppercase tracking-wide border-b border-blue-100 pb-1 mb-3">
    {children}
  </h3>
);

// â”€â”€â”€ Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const AdminShippingManagementPage = () => {
  const [searchInput, setSearchInput]     = useState("");
  const [orderNumber, setOrderNumber]     = useState("");
  const [mode, setMode]                   = useState<"idle" | "create" | "update">("idle");
  const [fetchLoading, setFetchLoading]   = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [record, setRecord]               = useState<ShippingRecord | null>(null);
  const [form, setForm]                   = useState<ShippingForm>(emptyForm);
  const [submitError, setSubmitError]     = useState("");
  const [warehouses, setWarehouses]       = useState<Warehouse[]>([]);

  // â”€â”€ Pending Orders list state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [pendingOrders, setPendingOrders]         = useState<PendingOrder[]>([]);
  const [pendingTotal, setPendingTotal]           = useState(0);
  const [pendingLoading, setPendingLoading]       = useState(false);
  const [pendingError, setPendingError]           = useState<string | null>(null);
  const [listOrderNumber, setListOrderNumber]     = useState("");
  const [listDateFrom, setListDateFrom]           = useState("");
  const [listDateTo, setListDateTo]               = useState("");
  const [listStatuses, setListStatuses]           = useState<string[]>([]);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const [listPage, setListPage]                   = useState(0);
  const LIST_PAGE_SIZE = 15;
  const [noShipmentFilter, setNoShipmentFilter]   = useState(false);
  const [modalOpen, setModalOpen]                 = useState(false);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node))
        setStatusDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchPendingOrders = async (overrides?: { orderNumber?: string; from?: string; to?: string }) => {
    setPendingLoading(true);
    setPendingError(null);
    try {
      const params = new URLSearchParams();
      const on   = overrides?.orderNumber ?? listOrderNumber;
      const from = overrides?.from ?? listDateFrom;
      const to   = overrides?.to  ?? listDateTo;
      if (on)   params.append("orderNumber", on);
      if (from) params.append("orderCreatedFrom", from);
      if (to)   params.append("orderCreatedTo", to);
      const qs = params.toString();
      const res  = await apiClient.get(`/api/order-shipment-details${qs ? `?${qs}` : ""}`);
      const data: OrderListResponse = await res.json();
      const all = data?.orders || [];
      setPendingOrders(all);
      setPendingTotal(all.length);
    } catch {
      setPendingError("Failed to fetch orders. Please try again.");
    } finally {
      setPendingLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => fetchPendingOrders(), 0);
    return () => clearTimeout(t);
  }, []);

  const handleListSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setListPage(0);
    fetchPendingOrders();
  };

  const handleListReset = () => {
    setListStatuses([]);
    setListOrderNumber("");
    setListDateFrom("");
    setListDateTo("");
    setNoShipmentFilter(false);
    setListPage(0);
    fetchPendingOrders({ orderNumber: "", from: "", to: "" });
  };

  const toggleStatus = (s: string) =>
    setListStatuses(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  const noAwbFilter = (orders: PendingOrder[]) =>
    orders.filter(o => o.shipments.length === 0 || o.shipments.every(s => !s.awb && !s.labelUrl));

  const filteredPending = (() => {
    let orders = listStatuses.length === 0
      ? pendingOrders
      : pendingOrders.filter(o => listStatuses.includes(o.orderStatus));
    if (noShipmentFilter && !listOrderNumber.trim()) orders = noAwbFilter(orders);
    return orders;
  })();
  const totalListPages = Math.ceil(filteredPending.length / LIST_PAGE_SIZE);
  const displayedPending = filteredPending.slice(listPage * LIST_PAGE_SIZE, (listPage + 1) * LIST_PAGE_SIZE);

  const loadOrderIntoForm = (on: string) => {
    setModalOpen(true);
    handleFetchByOrderNumber(on);
  };

  const closeModal = () => {
    setModalOpen(false);
    setMode("idle");
    setRecord(null);
    setOrderNumber("");
    setSearchInput("");
    setSubmitError("");
  };

  useEffect(() => {
    apiClient.get("/api/Get-All-Warehouses")
      .then(r => r.json())
      .then(data => setWarehouses(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  // â”€â”€ Fetch by order number (shared by form search + list row click) â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const handleFetchByOrderNumber = async (on: string) => {
    if (!on.trim()) return;
    setFetchLoading(true);
    setMode("idle");
    setRecord(null);
    setSubmitError("");
    setSearchInput(on);

    try {
      const res  = await apiClient.get(`/api/shipment/order/${encodeURIComponent(on.trim())}`);
      const data = await res.json();

      if (res.status === 404 || data.responseStatus === "FAILURE") {
        setOrderNumber(on.trim());
        setForm({ ...emptyForm });
        setMode("create");
        showToast("No shipping record found. Fill in the form to create one.");
      } else if (!res.ok) {
        throw new Error(data.responseMessage || `Request failed (${res.status})`);
      } else {
        setOrderNumber(on.trim());
        setRecord(data as ShippingRecord);
        setForm(recordToForm(data as ShippingRecord));
        setMode("update");
      }
    } catch (err: any) {
      showError(err.message || "Failed to fetch shipping details");
    } finally {
      setFetchLoading(false);
    }
  };

  // â”€â”€ Fetch (form search bar submit) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const handleFetch = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleFetchByOrderNumber(searchInput);
  };

  // â”€â”€ Submit â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber || mode === "idle") return;
    setSubmitLoading(true);
    setSubmitError("");

    try {
      const payload = buildPayload(form);
      const endpoint = `/api/shipment/order/${encodeURIComponent(orderNumber)}`;
      const res  = mode === "create"
        ? await apiClient.post(endpoint, payload)
        : await apiClient.put(endpoint, payload);
      const data = await res.json();

      if (!res.ok || data.responseStatus === "FAILURE") {
        throw new Error(data.responseMessage || "Operation failed");
      }

      showToast(data.responseMessage || (mode === "create" ? "Shipping record created" : "Shipping record updated"));

      // Refresh the record after success
      const refreshRes  = await apiClient.get(`/api/shipment/order/${encodeURIComponent(orderNumber)}`);
      const refreshData = await refreshRes.json();
      if (refreshRes.ok && refreshData.responseStatus !== "FAILURE") {
        setRecord(refreshData as ShippingRecord);
        setForm(recordToForm(refreshData as ShippingRecord));
        setMode("update");
      }
    } catch (err: any) {
      setSubmitError(err.message || "Operation failed");
    } finally {
      setSubmitLoading(false);
    }
  };

  // â”€â”€ Field change â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardSidebar />

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">

        {/* â•â• SECTION 1: Pending Shipping Orders list â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        <div>
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-gray-800">Shipping Management</h1>
            <p className="text-sm text-gray-500 mt-1">
              Orders below have no AWB number or label URL assigned yet.
            </p>
          </div>

          {/* List search/filter bar */}
          <form onSubmit={handleListSearch} className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
            <div className="flex flex-wrap items-end gap-3">
              {/* Status dropdown */}
              <div ref={statusDropdownRef} className="relative w-56">
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <button type="button" onClick={() => setStatusDropdownOpen(o => !o)}
                  className="w-full flex items-center justify-between border border-gray-300 rounded px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300">
                  <span className="truncate">
                    {listStatuses.length === 0 ? "All Statuses" : listStatuses.length === 1 ? listStatuses[0] : `${listStatuses.length} selected`}
                  </span>
                  <svg className={`w-4 h-4 ml-1 shrink-0 transition-transform ${statusDropdownOpen ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </button>
                {statusDropdownOpen && (
                  <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg py-1">
                    <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer text-sm">
                      <input type="checkbox" className="rounded" checked={listStatuses.length === 0} onChange={() => setListStatuses([])} />
                      All Statuses
                    </label>
                    <hr className="my-1" />
                    {ORDER_STATUS_OPTIONS.map(s => (
                      <label key={s} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer text-sm">
                        <input type="checkbox" className="rounded" checked={listStatuses.includes(s)} onChange={() => toggleStatus(s)} />
                        {s}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Order Number */}
              <div className="w-64">
                <label className="block text-sm font-medium text-gray-700 mb-1">Order Number</label>
                <input type="text" value={listOrderNumber} onChange={e => setListOrderNumber(e.target.value)}
                  placeholder="e.g. ORD-260511..." className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>

              {/* Date From */}
              <div className="w-44">
                <label className="block text-sm font-medium text-gray-700 mb-1">Created From</label>
                <input type="date" value={listDateFrom} onChange={e => setListDateFrom(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>

              {/* Date To */}
              <div className="w-44">
                <label className="block text-sm font-medium text-gray-700 mb-1">Created To</label>
                <input type="date" value={listDateTo} onChange={e => setListDateTo(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>

              {/* No Shipment filter */}
              <div className="flex items-center gap-2 pt-5">
                <label className="flex items-center gap-1.5 cursor-pointer select-none text-sm text-gray-700 whitespace-nowrap">
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={noShipmentFilter}
                    onChange={e => setNoShipmentFilter(e.target.checked)}
                  />
                  No Shipment
                </label>
              </div>

              <div className="flex gap-2 pt-5">
                <button type="submit" disabled={pendingLoading}
                  className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-60">
                  {pendingLoading ? "Searching…" : "Search"}
                </button>
                <button type="button" onClick={handleListReset} disabled={pendingLoading}
                  className="px-4 py-1.5 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50 disabled:opacity-60">
                  Reset
                </button>
              </div>
            </div>
          </form>

          <p className="text-sm text-gray-500 mb-3">
            Total orders: <span className="font-semibold">{pendingTotal}</span>
            {(listStatuses.length > 0 || noShipmentFilter) && (
              <span className="ml-2">â€” Showing <span className="font-semibold">{filteredPending.length}</span> filtered</span>
            )}
          </p>

          {pendingError && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">{pendingError}</div>
          )}

          {pendingLoading ? (
            <div className="flex justify-center py-10">
              <svg className="animate-spin h-7 w-7 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 text-gray-600">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium">Order Number</th>
                    <th className="text-left px-4 py-2.5 font-medium">Customer</th>
                    <th className="text-left px-4 py-2.5 font-medium">Order Status</th>
                    <th className="text-left px-4 py-2.5 font-medium">Payment</th>
                    <th className="text-right px-4 py-2.5 font-medium">Total</th>
                    <th className="text-left px-4 py-2.5 font-medium">Created At</th>
                    <th className="text-left px-4 py-2.5 font-medium">Shipments</th>
                    <th className="text-center px-4 py-2.5 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedPending.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-10 text-gray-400">No orders found.</td>
                    </tr>
                  ) : (
                    displayedPending.map(order => (
                      <tr key={order.orderId} className="border-t border-gray-100 hover:bg-blue-50/30 transition-colors">
                        <td className="px-4 py-2.5 font-mono text-xs font-semibold text-gray-800">{order.orderNumber}</td>
                        <td className="px-4 py-2.5">
                          <div className="font-medium text-gray-800">{order.customerName}</div>
                          <div className="text-xs text-gray-500">{order.customerEmail}</div>
                          <div className="text-xs text-gray-400">{order.customerPhone}</div>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${getStatusBadge(order.orderStatus)}`}>
                            {order.orderStatus}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${order.paymentStatus === "PAID" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                            {order.paymentStatus}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold whitespace-nowrap">
                          {order.currency || "INR"} {order.totalAmount?.toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-gray-600">{formatDate(order.orderCreatedAt)}</td>
                        <td className="px-4 py-2.5 text-gray-500 text-xs">
                          {order.shipments.length === 0 ? "No shipments" : `${order.shipments.length} shipment${order.shipments.length !== 1 ? "s" : ""} (no AWB)`}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <button type="button" onClick={() => loadOrderIntoForm(order.orderNumber)}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors">
                            {order.shipments.length > 0 ? "Edit Shipping" : "Add Shipping"}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!pendingLoading && totalListPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">
                Page <span className="font-semibold">{listPage + 1}</span> of <span className="font-semibold">{totalListPages}</span>
                {" "}â€” records {listPage * LIST_PAGE_SIZE + 1}â€“{Math.min((listPage + 1) * LIST_PAGE_SIZE, filteredPending.length)} of {filteredPending.length}
              </p>
              <div className="flex items-center gap-1">
                <button className="px-2 py-1 rounded border text-sm hover:bg-gray-50 disabled:opacity-40" onClick={() => setListPage(0)} disabled={listPage === 0}>Â«</button>
                <button className="px-2 py-1 rounded border text-sm hover:bg-gray-50 disabled:opacity-40" onClick={() => setListPage(p => Math.max(0, p - 1))} disabled={listPage === 0}>â€¹</button>
                {Array.from({ length: totalListPages }, (_, i) => i).filter(i => Math.abs(i - listPage) <= 2).map(i => (
                  <button key={i} onClick={() => setListPage(i)}
                    className={`px-2.5 py-1 rounded border text-sm ${i === listPage ? "bg-blue-500 text-white border-blue-500" : "hover:bg-gray-50"}`}>
                    {i + 1}
                  </button>
                ))}
                <button className="px-2 py-1 rounded border text-sm hover:bg-gray-50 disabled:opacity-40" onClick={() => setListPage(p => Math.min(totalListPages - 1, p + 1))} disabled={listPage === totalListPages - 1}>â€º</button>
                <button className="px-2 py-1 rounded border text-sm hover:bg-gray-50 disabled:opacity-40" onClick={() => setListPage(totalListPages - 1)} disabled={listPage === totalListPages - 1}>Â»</button>
              </div>
            </div>
          )}
        </div>

        {/* â•â• SECTION 2 â€” Modal â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col">

              {/* Modal header */}
              <div className="flex items-center justify-between px-6 py-4 border-b bg-blue-500 rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <h2 className="text-base font-bold text-white">Create / Update Shipping Record</h2>
                  {mode !== "idle" && (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${mode === "create" ? "bg-green-100 text-green-700" : "bg-white/20 text-white"}`}>
                      {mode === "create" ? "CREATE" : "UPDATE"} â€” {orderNumber}
                    </span>
                  )}
                </div>
                <button onClick={closeModal} className="text-white/80 hover:text-white transition-colors">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Scrollable body */}
              <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

                {/* Loading state */}
                {fetchLoading && (
                  <div className="flex justify-center py-10">
                    <svg className="animate-spin h-7 w-7 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                  </div>
                )}

        {/* â”€â”€ Existing record summary card â”€â”€ */}
        {!fetchLoading && mode === "update" && record && (
          <div className="bg-gray-50 border rounded-lg p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Order</p>
                <p className="font-semibold text-gray-800">{record.orderNumber}</p>
                {record.warehouseName && (
                  <p className="text-xs text-gray-500 mt-0.5">Warehouse: {record.warehouseName}</p>
                )}
              </div>
              <div>
                <span className={`px-2 py-1 rounded text-xs font-semibold ${statusBadgeClass(record.shipmentStatus)}`}>
                  {record.shipmentStatus}
                </span>
                <p className="text-xs text-gray-400 mt-1 text-right">
                  {record.shipmentType}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 mt-3 text-xs text-gray-600">
              {record.awbCode      && <span><span className="font-medium">AWB:</span> {record.awbCode}</span>}
              {record.courierName  && <span><span className="font-medium">Courier:</span> {record.courierName}</span>}
              {record.trackingNumber && <span><span className="font-medium">Tracking:</span> {record.trackingNumber}</span>}
              {record.shippingPrice != null && <span><span className="font-medium">Price:</span> â‚¹{record.shippingPrice}</span>}
              {record.shippedDate  && <span><span className="font-medium">Shipped:</span> {record.shippedDate.slice(0, 10)}</span>}
              {record.deliveredDate && <span><span className="font-medium">Delivered:</span> {record.deliveredDate.slice(0, 10)}</span>}
            </div>

            {/* Tracking history */}
            {record.trackingHistory?.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-gray-600 mb-2">Tracking History</p>
                <div className="space-y-1.5">
                  {record.trackingHistory.map((h, i) => (
                    <div key={i} className="flex items-start gap-3 text-xs">
                      <span className={`shrink-0 px-1.5 py-0.5 rounded font-semibold ${statusBadgeClass(h.status)}`}>
                        {h.status}
                      </span>
                      <span className="text-gray-600">
                        {h.location && <span className="font-medium">{h.location} â€” </span>}
                        {h.remarks}
                      </span>
                      <span className="ml-auto shrink-0 text-gray-400">{h.date?.slice(0, 16).replace("T", " ")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* â”€â”€ Create / Update form â”€â”€ */}
        {!fetchLoading && mode !== "idle" && (
          <div className="bg-white">
            <div className="flex items-center gap-3 mb-5">
              <span className={`text-xs font-semibold px-2 py-1 rounded ${mode === "create" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                {mode === "create" ? "CREATE" : "UPDATE"}
              </span>
              <p className="text-sm font-medium text-gray-700">{orderNumber}</p>
            </div>

            {submitError && (
              <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                {submitError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Warehouse & Shiprocket IDs */}
              <div>
                <SectionTitle>Warehouse & Shiprocket IDs</SectionTitle>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Warehouse</label>
                    <select
                      name="warehouseId"
                      value={form.warehouseId}
                      onChange={handleChange}
                      className="w-full border rounded px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                    >
                      <option value="">â€” select warehouse â€”</option>
                      {warehouses
                        .filter(w => w.status === "A")
                        .map(w => (
                          <option key={w.warehouseId} value={String(w.warehouseId)}>
                            {w.warehouseName} ({w.warehouseCode})
                          </option>
                        ))}
                    </select>
                  </div>
                  <Field label="Shiprocket Order ID"    name="shiprocketOrderId"    type="number" value={form.shiprocketOrderId}    onChange={handleChange} />
                  <Field label="Shiprocket Shipment ID" name="shiprocketShipmentId" type="number" value={form.shiprocketShipmentId} onChange={handleChange} />
                </div>
              </div>

              {/* Courier & AWB */}
              <div>
                <SectionTitle>Courier & AWB</SectionTitle>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field label="AWB Code"       name="awbCode"          value={form.awbCode}         onChange={handleChange} placeholder="AWBXYZ123" />
                  <Field label="Courier Name"   name="courierName"      value={form.courierName}     onChange={handleChange} placeholder="Delhivery" />
                  <Field label="Courier Company ID" name="courierCompanyId" type="number" value={form.courierCompanyId} onChange={handleChange} />
                </div>
              </div>

              {/* Shipment */}
              <div>
                <SectionTitle>Shipment Details</SectionTitle>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <SelectField label="Status" name="shipmentStatus" value={form.shipmentStatus} onChange={handleChange} options={SHIPMENT_STATUS_OPTIONS} />
                  <SelectField label="Type"   name="shipmentType"   value={form.shipmentType}   onChange={handleChange} options={SHIPMENT_TYPE_OPTIONS} />
                  <Field label="Tracking Number" name="trackingNumber" value={form.trackingNumber} onChange={handleChange} placeholder="TRK-ORD-..." />
                </div>
              </div>

              {/* Dimensions */}
              <div>
                <SectionTitle>Dimensions & Weight</SectionTitle>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <Field label="Length (cm)"  name="length"  type="number" value={form.length}  onChange={handleChange} placeholder="20" />
                  <Field label="Breadth (cm)" name="breadth" type="number" value={form.breadth} onChange={handleChange} placeholder="15" />
                  <Field label="Height (cm)"  name="height"  type="number" value={form.height}  onChange={handleChange} placeholder="10" />
                  <Field label="Weight (kg)"  name="weight"  type="number" value={form.weight}  onChange={handleChange} placeholder="1.2" />
                </div>
              </div>

              {/* Pricing & URLs */}
              <div>
                <SectionTitle>Pricing & URLs</SectionTitle>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field label="Shipping Price (â‚¹)" name="shippingPrice" type="number" value={form.shippingPrice} onChange={handleChange} placeholder="48.50" />
                  <Field label="Label URL" name="labelUrl" value={form.labelUrl} onChange={handleChange} placeholder="https://..." />
                  <Field label="Track URL" name="trackUrl" value={form.trackUrl} onChange={handleChange} placeholder="https://..." />
                </div>
              </div>

              {/* Dates */}
              <div>
                <SectionTitle>Dates</SectionTitle>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <Field label="Estimated Delivery"  name="estimatedDeliveryDate" type="date" value={form.estimatedDeliveryDate} onChange={handleChange} />
                  <Field label="Expected Delivery"   name="expectedDeliveryDate"  type="date" value={form.expectedDeliveryDate}  onChange={handleChange} />

                </div>
              </div>

              {/* Actions â€” inside form, sticky at bottom */}
              <div className="flex justify-end gap-3 pt-3 border-t mt-4">
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="px-6 py-2 text-sm font-semibold rounded-xl bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-60 flex items-center gap-2"
                >
                  {submitLoading && (
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                  )}
                  {submitLoading
                    ? (mode === "create" ? "Creating..." : "Updating...")
                    : (mode === "create" ? "Create Shipping Record" : "Update Shipping Record")}
                </button>
              </div>
            </form>
          </div>
        )}

              </div>{/* /scrollable body */}

              {/* Modal footer */}
              <div className="px-6 py-3 border-t bg-gray-50 rounded-b-2xl flex justify-end">
                <button onClick={closeModal} className="px-4 py-2 text-sm border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors">
                  Close
                </button>
              </div>

            </div>
          </div>
        )}

      </div>{/* /max-w-6xl */}
    </div>
  );
};

export default AdminShippingManagementPage;
