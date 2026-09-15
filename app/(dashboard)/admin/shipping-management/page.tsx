"use client";

import { DashboardSidebar } from "@/components";
import React, { useEffect, useState } from "react";
import { showToast, showError } from "@/lib/toast";
import apiClient from "@/lib/api";

// Types — per shipping-api-docs.md, Section 10 "Failed Shiprocket Step Orders"

interface OrderDetails {
  orderId: number;
  orderNumber: string;
  orderStatus: string;
  paymentStatus: string;
  totalAmount: number;
  orderCreatedAt: string | null;
  customerName: string;
  customerEmail: string;
  customerMobile: string;
}

interface StepLog {
  id: number;
  status: string;
  remarks: string | null;
  createdAt: string;
  updatedAt: string | null;
}

interface ShipmentLog {
  id: number;
  shipmentId: number;
  orderId: number;
  warehouseId: number | null;
  step: string;
  status: string;
  shiprocketOrderId: number | null;
  shiprocketShipmentId: number | null;
  awbCode: string | null;
  labelUrl: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ShippingDetails {
  shipmentId: number;
  trackingNumber: string | null;
  shipmentType: string | null;
  shipmentStatus: string | null;
  awb: string | null;
  courierName: string | null;
  courierCompanyId: number | null;
  shippingPrice: number | null;
  shippedDate: string | null;
  deliveredDate: string | null;
  shipmentCreatedAt: string | null;
  shipmentUpdatedAt: string | null;
  shiprocketOrderStatus: string | null;
  generateAwbStatus: string | null;
  requestPickupStatus: string | null;
  generateLabelStatus: string | null;
  trackShipmentStatus: string | null;
  estimateStatus: string | null;
  cartonId: number | null;
  length: number | null;
  breadth: number | null;
  height: number | null;
  weight: number | null;
  labelUrl: string | null;
  shipOrderId: number | null;
  shipShipmentId: number | null;
  pickupId: number | null;
  pickupToken: string | null;
  estimatedDeliveryDate: string | null;
  expectedDeliveryDate: string | null;
  trackUrl: string | null;
  shiprocketOrderStatuslog?: StepLog[];
  generateAwbStatuslog?: StepLog[];
  requestPickupStatuslog?: StepLog[];
  generateLabelStatuslog?: StepLog[];
  trackShipmentStatuslog?: StepLog[];
  estimateStatuslog?: StepLog[];
  shipmentlogs?: ShipmentLog[];
}

interface FailedStepOrder {
  orderDetails: OrderDetails;
  shippingDetails: ShippingDetails | null;
  failedSteps: string[];
}

interface FailedStepOrdersResponse {
  responseStatus: string;
  responseMessage: string;
  totalCount: number;
  orders: FailedStepOrder[];
}

// Types — per shiprocket-api-docs.md, Section 5 "Get Available Courier Services"

interface CourierService {
  courierId: number;
  courierName: string;
  price: number;
  codCharges: number;
  otherCharges: number;
  estimatedDeliveryDays: number;
  estimatedDeliveryDate: string;
  rating: number;
  codAvailable: boolean;
  isAir: boolean;
  isSurface: boolean;
}

interface CourierServicesResponse {
  responseStatus: string;
  responseMessage: string;
  totalCount: number;
  currentlyUsedCourierId: number | null;
  courierServices: CourierService[];
}

// Types — per shipping-api-docs.md, Section 9 "Order ID Based Shipment Management"

interface OrderShippingRecord {
  shipmentId: number;
  orderId: number;
  orderNumber: string;
  cartonId: number | null;
  cartonNo: string | null;
  trackingNumber: string | null;
  courierName: string | null;
  type: string | null;
  shipmentStatus: string | null;
  shippedDate: string | null;
  deliveredDate: string | null;
  length: number | null;
  breadth: number | null;
  height: number | null;
  weight: number | null;
  awb: string | null;
  labelUrl: string | null;
  shipOrderId: number | null;
  shipShipmentId: number | null;
  pickupId: number | null;
  pickupScheduledDate: string | null;
  pickupToken: string | null;
  courierCompanyId: number | null;
  estimatedDeliveryDate: string | null;
  expectedDeliveryDate: string | null;
  trackUrl: string | null;
  shippingPrice: number | null;
  shiprocketOrderStatus: string | null;
  generateAwbStatus: string | null;
  requestPickupStatus: string | null;
  generateLabelStatus: string | null;
  trackShipmentStatus: string | null;
  estimateStatus: string | null;
  warehouseId: number | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface OrderShippingRecordsResponse {
  responseStatus: string;
  responseMessage: string;
  data: OrderShippingRecord[];
  count: number;
}

type ShippingModalMode = "process" | "manual";

type EditableShipmentFields = {
  awb: string;
  shippingPrice: string;
  length: string;
  breadth: string;
  height: string;
  weight: string;
  shipOrderId: string;
  shipShipmentId: string;
  pickupId: string;
  pickupToken: string;
  pickupScheduledDate: string;
  estimatedDeliveryDate: string;
  expectedDeliveryDate: string;
  shippedDate: string;
  deliveredDate: string;
  labelUrl: string;
  trackUrl: string;
  shiprocketOrderStatus: string;
  generateAwbStatus: string;
  requestPickupStatus: string;
  generateLabelStatus: string;
  trackShipmentStatus: string;
  estimateStatus: string;
};

// Cartons — per cartons admin API (GET /api/cartons)

interface Carton {
  id: number;
  name: string;
  length: number;
  breadth: number;
  height: number;
  maxWeight: number;
  emptyWeight: number;
  status: string;
}

const STEP_COLUMNS: { key: keyof ShippingDetails; label: string }[] = [
  { key: "shiprocketOrderStatus", label: "Create Order" },
  { key: "generateAwbStatus", label: "Generate AWB" },
  { key: "requestPickupStatus", label: "Request Pickup" },
  { key: "generateLabelStatus", label: "Generate Label" },
  { key: "trackShipmentStatus", label: "Track Shipment" },
  { key: "estimateStatus", label: "Estimate" },
];

const ORDER_STATUS_OPTIONS = [
  "Confirmed",
  "Payment Failed",
  "Delivered",
  "Cancelled",
  "Returned",
  "Out for Delivery",
  "Ready to Ship",
  "Pickup scheduled",
];

function formatDateTime(d: string | null | undefined) {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return String(d);
  return date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

// Collapsed to a strict binary: SUCCESS stays SUCCESS, everything else
// (FAILED, SKIPPED, or null/not-yet-run) is displayed and colored as FAILED.
function stepBadgeClass(status: string | null) {
  if (status === "SUCCESS") return "bg-green-100 text-green-700";
  return "bg-red-100 text-red-700";
}

function stepDisplayLabel(status: string | null) {
  return status === "SUCCESS" ? "SUCCESS" : "FAILED";
}

function getOrderStatusBadge(status: string) {
  const s = (status || "").toLowerCase();
  if (s.includes("ready to ship")) return "bg-cyan-100 text-cyan-700";
  if (s.includes("confirm")) return "bg-blue-100 text-blue-700";
  return "bg-gray-100 text-gray-600";
}

function getOrderStatusOptions(currentStatus: string) {
  return currentStatus && !ORDER_STATUS_OPTIONS.includes(currentStatus)
    ? [currentStatus, ...ORDER_STATUS_OPTIONS]
    : ORDER_STATUS_OPTIONS;
}

function compactPayload(payload: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
}

function toDateInputValue(value: string | null | undefined) {
  if (!value) return "";
  return value.split(/[T ]/)[0];
}

function toShiprocketStatusValue(value: string | null | undefined) {
  const status = (value || "").toUpperCase();
  if (status === "SUCCESS") return "SUCCESS";
  if (status === "FAILED" || status === "FAILURE") return "FAILED";
  if (status === "SKIPPED") return "SKIPPED";
  return "";
}

const EMPTY_EDITABLE_SHIPMENT_FIELDS: EditableShipmentFields = {
  awb: "",
  shippingPrice: "",
  length: "",
  breadth: "",
  height: "",
  weight: "",
  shipOrderId: "",
  shipShipmentId: "",
  pickupId: "",
  pickupToken: "",
  pickupScheduledDate: "",
  estimatedDeliveryDate: "",
  expectedDeliveryDate: "",
  shippedDate: "",
  deliveredDate: "",
  labelUrl: "",
  trackUrl: "",
  shiprocketOrderStatus: "",
  generateAwbStatus: "",
  requestPickupStatus: "",
  generateLabelStatus: "",
  trackShipmentStatus: "",
  estimateStatus: "",
};

function editableShipmentFieldsFromRecord(record: OrderShippingRecord | null | undefined): EditableShipmentFields {
  return {
    awb: record?.awb || "",
    shippingPrice: record?.shippingPrice != null ? String(record.shippingPrice) : "",
    length: record?.length != null ? String(record.length) : "",
    breadth: record?.breadth != null ? String(record.breadth) : "",
    height: record?.height != null ? String(record.height) : "",
    weight: record?.weight != null ? String(record.weight) : "",
    shipOrderId: record?.shipOrderId != null ? String(record.shipOrderId) : "",
    shipShipmentId: record?.shipShipmentId != null ? String(record.shipShipmentId) : "",
    pickupId: record?.pickupId != null ? String(record.pickupId) : "",
    pickupToken: record?.pickupToken || "",
    pickupScheduledDate: toDateInputValue(record?.pickupScheduledDate),
    estimatedDeliveryDate: toDateInputValue(record?.estimatedDeliveryDate),
    expectedDeliveryDate: toDateInputValue(record?.expectedDeliveryDate),
    shippedDate: toDateInputValue(record?.shippedDate),
    deliveredDate: toDateInputValue(record?.deliveredDate),
    labelUrl: record?.labelUrl || "",
    trackUrl: record?.trackUrl || "",
    shiprocketOrderStatus: toShiprocketStatusValue(record?.shiprocketOrderStatus),
    generateAwbStatus: toShiprocketStatusValue(record?.generateAwbStatus),
    requestPickupStatus: toShiprocketStatusValue(record?.requestPickupStatus),
    generateLabelStatus: toShiprocketStatusValue(record?.generateLabelStatus),
    trackShipmentStatus: toShiprocketStatusValue(record?.trackShipmentStatus),
    estimateStatus: toShiprocketStatusValue(record?.estimateStatus),
  };
}

function numberOrUndefined(value: string) {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

const AdminShippingManagementPage = () => {
  const [orders, setOrders] = useState<FailedStepOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retriggeringOrder, setRetriggeringOrder] = useState<string | null>(null);

  // Retrigger modal — courier services lookup
  const [retriggerModalOrder, setRetriggerModalOrder] = useState<FailedStepOrder | null>(null);
  const [svcLoading, setSvcLoading] = useState(false);
  const [svcError, setSvcError] = useState<string | null>(null);
  const [courierServices, setCourierServices] = useState<CourierService[]>([]);
  const [currentlyUsedCourierId, setCurrentlyUsedCourierId] = useState<number | null>(null);
  const [selectedCourierId, setSelectedCourierId] = useState("");

  // Existing cartons — for the modal's carton selection dropdown
  const [cartons, setCartons] = useState<Carton[]>([]);
  const [cartonId, setCartonId] = useState("");
  const [shipmentType, setShipmentType] = useState("");
  const [orderStatus, setOrderStatus] = useState("");

  // New-carton fields — used as requestCreateCartonDTO when no existing carton is selected
  const [newCarton, setNewCarton] = useState({
    name: "",
    length: "",
    breadth: "",
    height: "",
    maxWeight: "",
    emptyWeight: "",
    who: "admin",
  });
  const [creatingShipment, setCreatingShipment] = useState(false);
  const [createShipmentError, setCreateShipmentError] = useState<string | null>(null);
  const [showShippingDetails, setShowShippingDetails] = useState(false);
  const [shippingModalMode, setShippingModalMode] = useState<ShippingModalMode>("process");
  const [orderShippingRecords, setOrderShippingRecords] = useState<Record<number, OrderShippingRecord[]>>({});
  const [orderShippingRecordsLoading, setOrderShippingRecordsLoading] = useState(false);
  const [orderShippingRecordsError, setOrderShippingRecordsError] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [stepLogModal, setStepLogModal] = useState<{ shippingDetails: ShippingDetails; stepKey: string; stepLabel: string; logs: StepLog[] } | null>(null);
  const [shipmentLogsModal, setShipmentLogsModal] = useState<{ shippingDetails: ShippingDetails; logs: ShipmentLog[] } | null>(null);
  const [createUpdateModalOrder, setCreateUpdateModalOrder] = useState<FailedStepOrder | null>(null);
  const [editableShipmentFields, setEditableShipmentFields] = useState<EditableShipmentFields>(EMPTY_EDITABLE_SHIPMENT_FIELDS);

  useEffect(() => {
    apiClient.get("/api/cartons?status=A")
      .then(r => r.json())
      .then(data => setCartons(data?.cartons || []))
      .catch(() => {});
  }, []);

  // An INITIALIZED shipment record means Shiprocket processing never really started — treat it as no shipment yet
  const hasShipment = (o: FailedStepOrder): o is FailedStepOrder & { shippingDetails: ShippingDetails } =>
    !!o.shippingDetails && o.shippingDetails.shipmentStatus !== "INITIALIZED";

  const fetchFailedStepOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get("/api/orders/failed-shiprocket-steps");
      const data: FailedStepOrdersResponse = await res.json();
      if (!res.ok || data.responseStatus === "FAILURE") {
        throw new Error(data.responseMessage || "Failed to fetch eligible orders");
      }
      setOrders(data.orders || []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch eligible orders. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFailedStepOrders();
  }, []);

  const handleRetrigger = async (orderNumber: string) => {
    setRetriggeringOrder(orderNumber);
    try {
      const res = await apiClient.post(`/api/order/${encodeURIComponent(orderNumber)}/retrigger-shipping`);
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.responseStatus === "FAILURE") {
        throw new Error(data?.responseMessage || "Retrigger failed");
      }
      showToast(data?.responseMessage || "Shipping process retriggered");
      fetchFailedStepOrders();
    } catch (err: any) {
      showError(err.message || "Failed to retrigger shipping process");
    } finally {
      setRetriggeringOrder(null);
    }
  };

  const openRetriggerModal = (order: FailedStepOrder, mode: ShippingModalMode = "process") => {
    setRetriggerModalOrder(order);
    setShippingModalMode(mode);
    setCourierServices([]);
    setCurrentlyUsedCourierId(null);
    setSelectedCourierId("");
    setSvcError(null);
    setCreateShipmentError(null);
    setShowShippingDetails(false);
    setOrderShippingRecordsError(null);

    // Preselect carton and prefill dimensions if available in the API response
    if (order.shippingDetails?.cartonId) {
      setCartonId(String(order.shippingDetails.cartonId));
      setNewCarton({ name: "", length: "", breadth: "", height: "", maxWeight: "", emptyWeight: "", who: "admin" });
    } else {
      setCartonId("");
      // Prefill new carton fields with dimensions/weight from the API response if available
      setNewCarton({
        name: "",
        length: order.shippingDetails?.length ? String(order.shippingDetails.length) : "",
        breadth: order.shippingDetails?.breadth ? String(order.shippingDetails.breadth) : "",
        height: order.shippingDetails?.height ? String(order.shippingDetails.height) : "",
        maxWeight: order.shippingDetails?.weight ? String(order.shippingDetails.weight * 1000) : "", // Convert kg to g
        emptyWeight: "",
        who: "admin",
      });
    }

    handleCheckCourierServices(order.orderDetails.orderId);
    if (mode === "manual") handleFetchOrderShippingRecords(order.orderDetails.orderId);
  };

  const closeRetriggerModal = () => setRetriggerModalOrder(null);

  const openCreateUpdateShipmentModal = (order: FailedStepOrder) => {
    setCreateUpdateModalOrder(order);
    setOrderShippingRecordsError(null);
    setCreateShipmentError(null);
    setCartonId("");
    setShipmentType("");
    setOrderStatus(order.orderDetails.orderStatus || "");
    setSelectedCourierId("");
    setCourierServices([]);
    setCurrentlyUsedCourierId(null);
    setSvcError(null);
    setEditableShipmentFields(EMPTY_EDITABLE_SHIPMENT_FIELDS);
    setOrderShippingRecords(prev => ({ ...prev, [order.orderDetails.orderId]: [] }));
    handleFetchOrderShippingRecords(order.orderDetails.orderId, true);
  };

  const closeCreateUpdateShipmentModal = () => setCreateUpdateModalOrder(null);

  const handleFetchOrderShippingRecords = async (orderId: number, refreshCourierServices = false) => {
    setOrderShippingRecordsLoading(true);
    setOrderShippingRecordsError(null);
    try {
      const res = await apiClient.get(`/api/order/${orderId}/shipping`);
      const data: OrderShippingRecordsResponse | null = await res.json().catch(() => null);
      if (res.status === 404) {
        setOrderShippingRecords(prev => ({ ...prev, [orderId]: [] }));
        setCartonId("");
        setShipmentType("");
        setEditableShipmentFields(EMPTY_EDITABLE_SHIPMENT_FIELDS);
        if (refreshCourierServices) await handleCheckCourierServices(orderId);
        return;
      }
      if (!res.ok || data?.responseStatus === "FAILURE") {
        throw new Error(data?.responseMessage || "Failed to fetch order shipping records");
      }
      const records = data?.data || [];
      setOrderShippingRecords(prev => ({ ...prev, [orderId]: records }));
      const firstRecord = records[0];
      setCartonId(firstRecord?.cartonId ? String(firstRecord.cartonId) : "");
      setShipmentType(firstRecord?.type || "");
      setEditableShipmentFields(editableShipmentFieldsFromRecord(firstRecord));
      const preferredCourierId = firstRecord?.courierCompanyId ? String(firstRecord.courierCompanyId) : "";
      setSelectedCourierId(preferredCourierId);
      if (refreshCourierServices) await handleCheckCourierServices(orderId, preferredCourierId);
    } catch (err: any) {
      setOrderShippingRecordsError(err.message || "Failed to fetch order shipping records");
    } finally {
      setOrderShippingRecordsLoading(false);
    }
  };

  const handleCheckCourierServices = async (orderId: number, preferredCourierId = "") => {
    setSvcLoading(true);
    setSvcError(null);
    setCourierServices([]);
    setSelectedCourierId("");
    try {
      const res = await apiClient.get(`/api/shipping/available-courier-services/${orderId}`);
      const data: CourierServicesResponse = await res.json();
      if (!res.ok || data.responseStatus === "FAILURE") {
        throw new Error(data.responseMessage || "Failed to fetch courier services");
      }
      setCourierServices(data.courierServices || []);
      setCurrentlyUsedCourierId(data.currentlyUsedCourierId ?? null);
      setSelectedCourierId(preferredCourierId || (data.currentlyUsedCourierId != null ? String(data.currentlyUsedCourierId) : ""));
    } catch (err: any) {
      setSvcError(err.message || "Failed to fetch courier services");
    } finally {
      setSvcLoading(false);
    }
  };

  const handleConfirmRetrigger = async () => {
    if (!retriggerModalOrder) return;
    const orderNumber = retriggerModalOrder.orderDetails.orderNumber;
    await handleRetrigger(orderNumber);
    closeRetriggerModal();
  };

  const handleNewCartonFieldChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewCarton(prev => ({ ...prev, [name]: value }));
  };

  const handleEditableShipmentFieldChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditableShipmentFields(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateShipment = async () => {
    if (!retriggerModalOrder) return;
    setCreateShipmentError(null);

    const payload: Record<string, unknown> = { orderId: retriggerModalOrder.orderDetails.orderId };
    if (cartonId) {
      payload.cartonNo = cartonId;
    } else {
      const { name, length, breadth, height, maxWeight, emptyWeight, who } = newCarton;
      if (!name.trim() || !length.trim() || !breadth.trim() || !height.trim() || !maxWeight.trim() || !emptyWeight.trim()) {
        setCreateShipmentError("Select an existing carton, or fill in all new carton fields (name, length, breadth, height, max weight, empty weight)");
        return;
      }
      payload.requestCreateCartonDTO = {
        name: name.trim(),
        length: parseFloat(length),
        breadth: parseFloat(breadth),
        height: parseFloat(height),
        maxWeight: parseFloat(maxWeight),
        emptyWeight: parseFloat(emptyWeight),
        who: who.trim() || "admin",
      };
    }
    if (selectedCourierId) payload.bestCourierId = parseInt(selectedCourierId, 10);

    setCreatingShipment(true);
    try {
      const res = await apiClient.post("/api/shipment/create", payload);
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.responseStatus === "FAILURE") {
        throw new Error(data?.responseMessage || "Failed to create shipment");
      }
      showToast(data?.responseMessage || "Shipment created and Shiprocket processing triggered");
      closeRetriggerModal();
      fetchFailedStepOrders();
    } catch (err: any) {
      setCreateShipmentError(err.message || "Failed to create shipment");
    } finally {
      setCreatingShipment(false);
    }
  };

  const handleCreateOrUpdateShipment = async () => {
    if (!createUpdateModalOrder) return;
    setCreateShipmentError(null);

    if (!cartonId) {
      setCreateShipmentError("Select an existing carton before creating or updating the shipment record");
      return;
    }

    const orderId = createUpdateModalOrder.orderDetails.orderId;
    const existingRecord = orderShippingRecords[orderId]?.[0];
    const shippingDetails = createUpdateModalOrder.shippingDetails;
    const selectedCourier = courierServices.find(c => String(c.courierId) === String(selectedCourierId));

    const payload = compactPayload({
      cartonId: parseInt(cartonId, 10),
      trackingNumber: existingRecord?.trackingNumber ?? shippingDetails?.trackingNumber,
      courierName: selectedCourier?.courierName ?? existingRecord?.courierName ?? shippingDetails?.courierName,
      type: shipmentType || existingRecord?.type || shippingDetails?.shipmentType || "FORWARD",
      orderStatus,
      shipmentStatus: existingRecord?.shipmentStatus ?? shippingDetails?.shipmentStatus ?? "CREATED",
      shippedDate: editableShipmentFields.shippedDate,
      deliveredDate: editableShipmentFields.deliveredDate,
      length: numberOrUndefined(editableShipmentFields.length),
      breadth: numberOrUndefined(editableShipmentFields.breadth),
      height: numberOrUndefined(editableShipmentFields.height),
      weight: numberOrUndefined(editableShipmentFields.weight),
      awb: editableShipmentFields.awb,
      labelUrl: editableShipmentFields.labelUrl,
      shipOrderId: numberOrUndefined(editableShipmentFields.shipOrderId),
      shipShipmentId: numberOrUndefined(editableShipmentFields.shipShipmentId),
      pickupId: numberOrUndefined(editableShipmentFields.pickupId),
      pickupScheduledDate: editableShipmentFields.pickupScheduledDate,
      pickupToken: editableShipmentFields.pickupToken,
      courierCompanyId: selectedCourierId ? parseInt(selectedCourierId, 10) : existingRecord?.courierCompanyId ?? shippingDetails?.courierCompanyId,
      estimatedDeliveryDate: editableShipmentFields.estimatedDeliveryDate,
      expectedDeliveryDate: editableShipmentFields.expectedDeliveryDate,
      trackUrl: editableShipmentFields.trackUrl,
      shippingPrice: numberOrUndefined(editableShipmentFields.shippingPrice) ?? selectedCourier?.price,
      shiprocketOrderStatus: editableShipmentFields.shiprocketOrderStatus,
      generateAwbStatus: editableShipmentFields.generateAwbStatus,
      requestPickupStatus: editableShipmentFields.requestPickupStatus,
      generateLabelStatus: editableShipmentFields.generateLabelStatus,
      trackShipmentStatus: editableShipmentFields.trackShipmentStatus,
      estimateStatus: editableShipmentFields.estimateStatus,
      warehouseId: existingRecord?.warehouseId,
    });

    setCreatingShipment(true);
    try {
      const res = await apiClient.post(`/api/order/${orderId}/shipping`, payload);
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.responseStatus === "FAILURE") {
        throw new Error(data?.responseMessage || "Failed to create or update shipment");
      }
      showToast(data?.responseMessage || "Shipment record created or updated successfully");
      closeCreateUpdateShipmentModal();
      fetchFailedStepOrders();
    } catch (err: any) {
      setCreateShipmentError(err.message || "Failed to create or update shipment");
    } finally {
      setCreatingShipment(false);
    }
  };

  const createUpdateShippingRecord = createUpdateModalOrder
    ? orderShippingRecords[createUpdateModalOrder.orderDetails.orderId]?.[0]
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardSidebar />

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Shipping Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Confirmed / Ready-to-Ship orders with a failed Shiprocket pipeline step, or no shipment created yet.
          </p>
        </div>

        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500">
            Total: <span className="font-semibold">{orders.length}</span>
          </p>
          <button
            type="button"
            onClick={fetchFailedStepOrders}
            disabled={loading}
            className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">{error}</div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <svg className="animate-spin h-7 w-7 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm bg-white rounded-lg border border-gray-200">
            No orders currently eligible for the shipment process.
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map(o => (
              <div key={o.orderDetails.orderId} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow p-4">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="font-mono text-sm font-semibold text-gray-800">{o.orderDetails.orderNumber}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {o.orderDetails.customerName} &bull; {o.orderDetails.customerEmail} &bull; {o.orderDetails.customerMobile}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getOrderStatusBadge(o.orderDetails.orderStatus)}`}>
                      {o.orderDetails.orderStatus}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${o.orderDetails.paymentStatus === "PAID" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                      {o.orderDetails.paymentStatus}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-sm mb-3">
                  <div><p className="text-xs text-gray-400">Total Amount</p><p className="font-semibold">₹{o.orderDetails.totalAmount?.toLocaleString("en-IN")}</p></div>
                  <div><p className="text-xs text-gray-400">Order Created</p><p>{formatDateTime(o.orderDetails.orderCreatedAt)}</p></div>
                  <div><p className="text-xs text-gray-400">Shipment Status</p><p>{o.shippingDetails?.shipmentStatus || "—"}</p></div>
                  <div><p className="text-xs text-gray-400">AWB / Courier</p><p>{o.shippingDetails?.awb || "—"} {o.shippingDetails?.courierName ? `(${o.shippingDetails.courierName})` : ""}</p></div>
                </div>

                {!hasShipment(o) && (
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Failed Steps</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(o.shippingDetails?.shipmentStatus === "INITIALIZED" && !o.failedSteps.includes("no_shipment")
                        ? ["no_shipment", ...o.failedSteps]
                        : o.failedSteps
                      ).map(step => (
                        <span key={step} className="px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700">
                          {step === "no_shipment" ? "No shipment created" : step}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {hasShipment(o) && (
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Pipeline Steps</p>
                    <div className="flex flex-wrap gap-3">
                      {STEP_COLUMNS.map(({ key, label }) => {
                        const status = o.shippingDetails![key] as string | null;
                        const logKey = `${key}log` as keyof ShippingDetails;
                        const logs = (o.shippingDetails![logKey] as StepLog[] | undefined) || [];
                        return (
                          <button
                            key={key}
                            onClick={() => {
                              if (logs.length > 0) {
                                setStepLogModal({ shippingDetails: o.shippingDetails!, stepKey: key, stepLabel: label, logs });
                              }
                            }}
                            disabled={logs.length === 0}
                            className={`text-xs font-semibold underline transition-colors ${
                              status === "SUCCESS" ? "text-green-600 hover:text-green-800" :
                              status === "FAILURE" ? "text-red-600 hover:text-red-800" :
                              "text-gray-600 hover:text-gray-800"
                            } ${
                              logs.length > 0 ? "cursor-pointer" : "cursor-not-allowed opacity-60"
                            }`}
                            title={logs.length > 0 ? `Click to view ${label} logs` : `No logs available for ${label}`}
                          >
                            {label}: {stepDisplayLabel(status)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {hasShipment(o) && (
                  <div className="mb-3">
                    <div className="flex items-center gap-4 mb-2">
                      <button
                        onClick={() => setExpandedOrderId(expandedOrderId === o.orderDetails.orderId ? null : o.orderDetails.orderId)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                      >
                        {expandedOrderId === o.orderDetails.orderId ? "Hide existing shipping details" : "View existing shipping details"}
                      </button>
                      {o.shippingDetails.shipmentlogs && o.shippingDetails.shipmentlogs.length > 0 && (
                        <button
                          onClick={() => setShipmentLogsModal({ shippingDetails: o.shippingDetails!, logs: o.shippingDetails.shipmentlogs! })}
                          className="text-xs font-semibold text-green-600 hover:text-green-800 hover:underline transition-colors"
                        >
                          View Shipment Logs
                        </button>
                      )}
                    </div>

                    {expandedOrderId === o.orderDetails.orderId && (
                      <div className="border border-blue-200 rounded-lg p-3 bg-blue-50 mb-3 text-sm">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                          <div><span className="text-xs text-gray-500">Shipment ID</span><p className="font-mono text-gray-800">{o.shippingDetails.shipmentId}</p></div>
                          <div><span className="text-xs text-gray-500">Tracking Number</span><p className="font-mono text-gray-800">{o.shippingDetails.trackingNumber || "—"}</p></div>
                          <div><span className="text-xs text-gray-500">Shipment Status</span><p className="font-semibold text-gray-800">{o.shippingDetails.shipmentStatus || "—"}</p></div>
                          <div><span className="text-xs text-gray-500">Shipment Type</span><p className="font-semibold text-gray-800">{o.shippingDetails.shipmentType || "—"}</p></div>
                          <div><span className="text-xs text-gray-500">AWB</span><p className="font-mono text-gray-800">{o.shippingDetails.awb || "—"}</p></div>
                          <div><span className="text-xs text-gray-500">Courier Name</span><p className="text-gray-800">{o.shippingDetails.courierName || "—"}</p></div>
                          <div><span className="text-xs text-gray-500">Shipping Price</span><p className="font-semibold text-gray-800">₹{o.shippingDetails.shippingPrice?.toFixed(2) || "—"}</p></div>
                          <div><span className="text-xs text-gray-500">Carton ID</span><p className="font-mono text-gray-800">{o.shippingDetails.cartonId || "—"}</p></div>
                          <div><span className="text-xs text-gray-500">Length (cm)</span><p className="font-mono text-gray-800">{o.shippingDetails.length || "—"}</p></div>
                          <div><span className="text-xs text-gray-500">Breadth (cm)</span><p className="font-mono text-gray-800">{o.shippingDetails.breadth || "—"}</p></div>
                          <div><span className="text-xs text-gray-500">Height (cm)</span><p className="font-mono text-gray-800">{o.shippingDetails.height || "—"}</p></div>
                          <div><span className="text-xs text-gray-500">Weight (kg)</span><p className="font-mono text-gray-800">{o.shippingDetails.weight || "—"}</p></div>
                          <div><span className="text-xs text-gray-500">Shiprocket Order ID</span><p className="font-mono text-gray-800">{o.shippingDetails.shipOrderId || "—"}</p></div>
                          <div><span className="text-xs text-gray-500">Shiprocket Shipment ID</span><p className="font-mono text-gray-800">{o.shippingDetails.shipShipmentId || "—"}</p></div>
                          <div><span className="text-xs text-gray-500">Estimated Delivery</span><p className="font-mono text-gray-800">{o.shippingDetails.estimatedDeliveryDate || "—"}</p></div>
                          <div><span className="text-xs text-gray-500">Expected Delivery</span><p className="font-mono text-gray-800">{o.shippingDetails.expectedDeliveryDate || "—"}</p></div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => openCreateUpdateShipmentModal(o)}
                    disabled={retriggeringOrder === o.orderDetails.orderNumber}
                    className="px-4 py-1.5 text-sm font-semibold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-60"
                  >
                    Create / Update Shipment
                  </button>
                  <button
                    type="button"
                    onClick={() => openRetriggerModal(o)}
                    disabled={retriggeringOrder === o.orderDetails.orderNumber}
                    title={!hasShipment(o) ? "No shipment record exists yet for this order — the server will report if retrigger isn't possible" : undefined}
                    className="px-4 py-1.5 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-60"
                  >
                    {retriggeringOrder === o.orderDetails.orderNumber ? "Processing…" : "Process Shipping"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Shipping action modal — courier service lookup */}
      {retriggerModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={e => { if (e.target === e.currentTarget) closeRetriggerModal(); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b bg-blue-500 rounded-t-2xl">
              <div>
                <h2 className="text-base font-bold text-white">
                  {shippingModalMode === "manual" ? "Create / Update Shipment" : "Shipping Process"} &mdash; {retriggerModalOrder.orderDetails.orderNumber}
                </h2>
                <p className="text-xs text-white/80 mt-0.5">{retriggerModalOrder.orderDetails.customerName}</p>
              </div>
              <button onClick={closeRetriggerModal} className="text-white/80 hover:text-white transition-colors">✕</button>
            </div>

            <div className="overflow-y-auto px-6 py-4 space-y-4">
              {shippingModalMode === "manual" && (
                <div className="border border-emerald-200 rounded-lg p-3 bg-emerald-50 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-emerald-900">Order ID shipping record</p>
                      <p className="text-xs text-emerald-700 mt-0.5">Fetched from /api/order/{retriggerModalOrder.orderDetails.orderId}/shipping</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleFetchOrderShippingRecords(retriggerModalOrder.orderDetails.orderId)}
                      disabled={orderShippingRecordsLoading}
                      className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 disabled:opacity-60"
                    >
                      {orderShippingRecordsLoading ? "Loading…" : "Refresh"}
                    </button>
                  </div>
                  {orderShippingRecordsError ? (
                    <p className="mt-2 text-xs text-red-600">{orderShippingRecordsError}</p>
                  ) : orderShippingRecordsLoading ? (
                    <p className="mt-2 text-xs text-emerald-700">Loading existing shipping records…</p>
                  ) : (orderShippingRecords[retriggerModalOrder.orderDetails.orderId]?.length || 0) > 0 ? (
                    <p className="mt-2 text-xs text-emerald-700">
                      Existing record found. The selected carton and courier are prefilled when available.
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-emerald-700">No existing order-id shipping record found yet.</p>
                  )}
                </div>
              )}

              {showShippingDetails && retriggerModalOrder.shippingDetails && (
                <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                  <h3 className="text-sm font-bold text-gray-800 mb-3">Current Shipping Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div><span className="text-xs text-gray-500">Shipment ID</span><p className="font-mono text-gray-800">{retriggerModalOrder.shippingDetails.shipmentId}</p></div>
                    <div><span className="text-xs text-gray-500">Tracking Number</span><p className="font-mono text-gray-800">{retriggerModalOrder.shippingDetails.trackingNumber || "—"}</p></div>
                    <div><span className="text-xs text-gray-500">Shipment Status</span><p className="font-semibold text-gray-800">{retriggerModalOrder.shippingDetails.shipmentStatus || "—"}</p></div>
                    <div><span className="text-xs text-gray-500">Shipment Type</span><p className="font-semibold text-gray-800">{retriggerModalOrder.shippingDetails.shipmentType || "—"}</p></div>
                    <div><span className="text-xs text-gray-500">AWB</span><p className="font-mono text-gray-800">{retriggerModalOrder.shippingDetails.awb || "—"}</p></div>
                    <div><span className="text-xs text-gray-500">Courier Name</span><p className="text-gray-800">{retriggerModalOrder.shippingDetails.courierName || "—"}</p></div>
                    <div><span className="text-xs text-gray-500">Courier Company ID</span><p className="font-mono text-gray-800">{retriggerModalOrder.shippingDetails.courierCompanyId || "—"}</p></div>
                    <div><span className="text-xs text-gray-500">Shipping Price</span><p className="font-semibold text-gray-800">₹{retriggerModalOrder.shippingDetails.shippingPrice?.toFixed(2) || "—"}</p></div>
                    <div><span className="text-xs text-gray-500">Carton ID</span><p className="font-mono text-gray-800">{retriggerModalOrder.shippingDetails.cartonId || "—"}</p></div>
                    <div><span className="text-xs text-gray-500">Length (cm)</span><p className="font-mono text-gray-800">{retriggerModalOrder.shippingDetails.length || "—"}</p></div>
                    <div><span className="text-xs text-gray-500">Breadth (cm)</span><p className="font-mono text-gray-800">{retriggerModalOrder.shippingDetails.breadth || "—"}</p></div>
                    <div><span className="text-xs text-gray-500">Height (cm)</span><p className="font-mono text-gray-800">{retriggerModalOrder.shippingDetails.height || "—"}</p></div>
                    <div><span className="text-xs text-gray-500">Weight (kg)</span><p className="font-mono text-gray-800">{retriggerModalOrder.shippingDetails.weight || "—"}</p></div>
                    <div><span className="text-xs text-gray-500">Shiprocket Order ID</span><p className="font-mono text-gray-800">{retriggerModalOrder.shippingDetails.shipOrderId || "—"}</p></div>
                    <div><span className="text-xs text-gray-500">Shiprocket Shipment ID</span><p className="font-mono text-gray-800">{retriggerModalOrder.shippingDetails.shipShipmentId || "—"}</p></div>
                    <div><span className="text-xs text-gray-500">Pickup ID</span><p className="font-mono text-gray-800">{retriggerModalOrder.shippingDetails.pickupId || "—"}</p></div>
                    <div><span className="text-xs text-gray-500">Pickup Token</span><p className="font-mono text-gray-800">{retriggerModalOrder.shippingDetails.pickupToken || "—"}</p></div>
                    <div><span className="text-xs text-gray-500">Estimated Delivery Date</span><p className="font-mono text-gray-800">{retriggerModalOrder.shippingDetails.estimatedDeliveryDate || "—"}</p></div>
                    <div><span className="text-xs text-gray-500">Expected Delivery Date</span><p className="font-mono text-gray-800">{retriggerModalOrder.shippingDetails.expectedDeliveryDate || "—"}</p></div>
                    <div className="md:col-span-2"><span className="text-xs text-gray-500">Shipment Created At</span><p className="font-mono text-gray-800">{retriggerModalOrder.shippingDetails.shipmentCreatedAt || "—"}</p></div>
                    <div className="md:col-span-2"><span className="text-xs text-gray-500">Shipment Updated At</span><p className="font-mono text-gray-800">{retriggerModalOrder.shippingDetails.shipmentUpdatedAt || "—"}</p></div>
                    <div className="md:col-span-2"><span className="text-xs text-gray-500">Label URL</span><p className="font-mono text-blue-600 break-all">{retriggerModalOrder.shippingDetails.labelUrl ? <a href={retriggerModalOrder.shippingDetails.labelUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">{retriggerModalOrder.shippingDetails.labelUrl}</a> : "—"}</p></div>
                    <div className="md:col-span-2"><span className="text-xs text-gray-500">Track URL</span><p className="font-mono text-blue-600 break-all">{retriggerModalOrder.shippingDetails.trackUrl ? <a href={retriggerModalOrder.shippingDetails.trackUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">{retriggerModalOrder.shippingDetails.trackUrl}</a> : "—"}</p></div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <p className="text-xs font-semibold text-gray-600 mb-2">Pipeline Step Status</p>
                    <div className="flex flex-wrap gap-3">
                      {[
                        { key: "shiprocketOrderStatus", label: "Create Order", logKey: "shiprocketOrderStatuslog" },
                        { key: "generateAwbStatus", label: "Generate AWB", logKey: "generateAwbStatuslog" },
                        { key: "requestPickupStatus", label: "Request Pickup", logKey: "requestPickupStatuslog" },
                        { key: "generateLabelStatus", label: "Generate Label", logKey: "generateLabelStatuslog" },
                        { key: "trackShipmentStatus", label: "Track Shipment", logKey: "trackShipmentStatuslog" },
                        { key: "estimateStatus", label: "Estimate", logKey: "estimateStatuslog" }
                      ].map(({ key, label, logKey }) => {
                        const status = retriggerModalOrder.shippingDetails[key as keyof ShippingDetails] as string | null;
                        const logs = (retriggerModalOrder.shippingDetails[logKey as keyof ShippingDetails] as StepLog[] | undefined) || [];
                        return (
                          <button
                            key={key}
                            onClick={() => {
                              if (logs.length > 0) {
                                setStepLogModal({ shippingDetails: retriggerModalOrder.shippingDetails, stepKey: key, stepLabel: label, logs });
                              }
                            }}
                            disabled={logs.length === 0}
                            className={`text-xs font-semibold underline transition-colors ${
                              status === "SUCCESS" ? "text-green-600 hover:text-green-800" :
                              status === "FAILURE" ? "text-red-600 hover:text-red-800" :
                              "text-gray-600 hover:text-gray-800"
                            } ${
                              logs.length > 0 ? "cursor-pointer" : "cursor-not-allowed opacity-60"
                            }`}
                            title={logs.length > 0 ? `Click to view ${label} logs` : `No logs available for ${label}`}
                          >
                            {label}: {status || "—"}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {retriggerModalOrder.shippingDetails && (
                <button
                  onClick={() => setShowShippingDetails(!showShippingDetails)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                >
                  {showShippingDetails ? "Hide existing shipping details" : "View existing shipping details"}
                </button>
              )}

              <div>
                <label className="block text-xs text-gray-500 mb-1">Carton</label>
                <select value={cartonId} onChange={e => setCartonId(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300">
                  <option value="">Select an existing carton…</option>
                  {cartons.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.length}×{c.breadth}×{c.height} cm, max {c.maxWeight}g)
                    </option>
                  ))}
                </select>
              </div>

              {shippingModalMode === "manual" && !cartonId && (
                <div className="px-3 py-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
                  The order-id shipping API requires an existing carton. Select one before using Create / Update Shipment.
                </div>
              )}

              {!cartonId && shippingModalMode === "process" && (
                <div className="border border-gray-200 rounded p-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Or create a new carton</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="col-span-2 md:col-span-3">
                      <label className="block text-xs text-gray-500 mb-1">Name *</label>
                      <input name="name" value={newCarton.name} onChange={handleNewCartonFieldChange}
                        className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Length (cm) *</label>
                      <input type="number" name="length" value={newCarton.length} onChange={handleNewCartonFieldChange}
                        className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Breadth (cm) *</label>
                      <input type="number" name="breadth" value={newCarton.breadth} onChange={handleNewCartonFieldChange}
                        className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Height (cm) *</label>
                      <input type="number" name="height" value={newCarton.height} onChange={handleNewCartonFieldChange}
                        className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Max Weight (g) *</label>
                      <input type="number" name="maxWeight" value={newCarton.maxWeight} onChange={handleNewCartonFieldChange}
                        className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Empty Weight (g) *</label>
                      <input type="number" name="emptyWeight" value={newCarton.emptyWeight} onChange={handleNewCartonFieldChange}
                        className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Who</label>
                      <input name="who" value={newCarton.who} onChange={handleNewCartonFieldChange}
                        className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Available Courier Services</label>
                <button type="button" onClick={() => handleCheckCourierServices(retriggerModalOrder.orderDetails.orderId)} disabled={svcLoading}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 disabled:opacity-60">
                  {svcLoading ? "Refreshing…" : "Refresh"}
                </button>
              </div>

              {svcLoading ? (
                <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
                  <svg className="animate-spin h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Loading eligible courier services for this order…
                </div>
              ) : svcError ? (
                <div className="px-3 py-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">{svcError}</div>
              ) : courierServices.length === 0 ? (
                <p className="text-xs text-gray-400">No courier services available for this order.</p>
              ) : (
                <div className="space-y-2">
                  {courierServices.map(c => (
                    <label key={c.courierId} className="flex items-center gap-3 border border-gray-200 rounded px-3 py-2 text-sm cursor-pointer hover:bg-blue-50/40 has-[:checked]:border-blue-400 has-[:checked]:bg-blue-50/60">
                      <input
                        type="radio"
                        name="selectedCourier"
                        value={c.courierId}
                        checked={String(selectedCourierId) === String(c.courierId)}
                        onChange={e => setSelectedCourierId(e.target.value)}
                        className="shrink-0"
                      />
                      <span className="flex-1 font-medium text-gray-800">{c.courierName}</span>
                      <span className="text-gray-600">₹{c.price?.toFixed(2)}</span>
                      <span className="text-gray-400">{c.estimatedDeliveryDays} day(s)</span>
                      {c.codAvailable && <span className="text-xs text-green-700 bg-green-100 px-1.5 py-0.5 rounded">COD</span>}
                      {currentlyUsedCourierId === c.courierId && (
                        <span className="text-xs text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">Currently used</span>
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>

            {createShipmentError && (
              <div className="mx-6 mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">{createShipmentError}</div>
            )}

            <div className="px-6 py-3 border-t bg-gray-50 rounded-b-2xl flex justify-end gap-3">
              <button onClick={closeRetriggerModal} disabled={retriggeringOrder === retriggerModalOrder.orderDetails.orderNumber || creatingShipment}
                className="px-4 py-1.5 text-sm border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-60">
                Cancel
              </button>
              <button
                onClick={shippingModalMode === "manual" ? handleCreateOrUpdateShipment : handleCreateShipment}
                disabled={creatingShipment || (shippingModalMode === "manual" && orderShippingRecordsLoading)}
                className="px-4 py-1.5 text-sm border border-blue-300 text-blue-700 rounded-xl hover:bg-blue-50 transition-colors disabled:opacity-60">
                {creatingShipment
                  ? (shippingModalMode === "manual" ? "Saving…" : "Creating…")
                  : (shippingModalMode === "manual" ? "Create / Update Shipment" : "Create Shipment")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Update Shipment Details Modal */}
      {createUpdateModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={e => { if (e.target === e.currentTarget) closeCreateUpdateShipmentModal(); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b bg-blue-500 rounded-t-2xl">
              <div>
                <h2 className="text-base font-bold text-white">Create / Update Shipment — {createUpdateModalOrder.orderDetails.orderNumber}</h2>
                <p className="text-xs text-white/80 mt-0.5">
                  GET /api/order/{createUpdateModalOrder.orderDetails.orderId}/shipping
                </p>
              </div>
              <button onClick={closeCreateUpdateShipmentModal} className="text-white/80 hover:text-white transition-colors">✕</button>
            </div>

            <div className="overflow-y-auto px-6 py-4 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800">Shipping Details</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {orderShippingRecordsLoading
                      ? "Fetching shipping details…"
                      : createUpdateShippingRecord
                        ? "Record found"
                        : "No record found"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleFetchOrderShippingRecords(createUpdateModalOrder.orderDetails.orderId, true)}
                  disabled={orderShippingRecordsLoading}
                  className="px-3 py-1.5 text-xs font-semibold border border-emerald-300 text-emerald-700 rounded-lg hover:bg-emerald-50 disabled:opacity-60"
                >
                  {orderShippingRecordsLoading ? "Refreshing…" : "Refresh"}
                </button>
              </div>

              {orderShippingRecordsError && (
                <div className="px-3 py-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">{orderShippingRecordsError}</div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <label className="block">
                  <span className="block text-xs text-gray-500 mb-1">Carton ID</span>
                  <select
                    value={cartonId}
                    onChange={e => setCartonId(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  >
                    <option value="">Select carton</option>
                    {cartons.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.id} - {c.name} ({c.length}×{c.breadth}×{c.height} cm)
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="block text-xs text-gray-500 mb-1">Type</span>
                  <select
                    value={shipmentType}
                    onChange={e => setShipmentType(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  >
                    <option value="">Select type</option>
                    <option value="FORWARD">FORWARD</option>
                    <option value="RETURN_PICKUP">RETURN_PICKUP</option>
                  </select>
                </label>
                <label className="block md:col-span-2">
                  <span className="block text-xs text-gray-500 mb-1">Courier Service</span>
                  <select
                    value={selectedCourierId}
                    onChange={e => setSelectedCourierId(e.target.value)}
                    disabled={svcLoading}
                    className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:opacity-60"
                  >
                    <option value="">{svcLoading ? "Loading courier services…" : "Select courier service"}</option>
                    {courierServices.map(c => (
                      <option key={c.courierId} value={c.courierId}>
                        {c.courierId} - {c.courierName} - ₹{c.price?.toFixed(2)} - {c.estimatedDeliveryDays} day(s)
                      </option>
                    ))}
                  </select>
                  {svcError && <p className="mt-1 text-xs text-red-600">{svcError}</p>}
                </label>
                <label className="block">
                  <span className="block text-xs text-gray-500 mb-1">Courier Company ID</span>
                  <input
                    readOnly
                    value={selectedCourierId}
                    className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm bg-gray-50 text-gray-800 focus:outline-none"
                  />
                </label>
                {[
                  { label: "Order Number", value: createUpdateShippingRecord?.orderNumber },
                  { label: "Shipment Status", value: createUpdateShippingRecord?.shipmentStatus },
                ].map(field => (
                  <label key={field.label} className="block">
                    <span className="block text-xs text-gray-500 mb-1">{field.label}</span>
                    <input
                      readOnly
                      value={field.value ?? ""}
                      className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm bg-gray-50 text-gray-800 focus:outline-none"
                    />
                  </label>
                ))}
                <label className="block">
                  <span className="block text-xs text-gray-500 mb-1">Order Status</span>
                  <select
                    value={orderStatus}
                    onChange={e => setOrderStatus(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  >
                    <option value="">Select order status</option>
                    {getOrderStatusOptions(createUpdateModalOrder.orderDetails.orderStatus || orderStatus).map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </label>
                {[
                  { label: "AWB", name: "awb", type: "text" },
                  { label: "Shipping Price", name: "shippingPrice", type: "number" },
                  { label: "Length (cm)", name: "length", type: "number" },
                  { label: "Breadth (cm)", name: "breadth", type: "number" },
                  { label: "Height (cm)", name: "height", type: "number" },
                  { label: "Weight (kg)", name: "weight", type: "number" },
                  { label: "Shiprocket Order ID", name: "shipOrderId", type: "number" },
                  { label: "Shiprocket Shipment ID", name: "shipShipmentId", type: "number" },
                  { label: "Pickup ID", name: "pickupId", type: "number" },
                  { label: "Pickup Token", name: "pickupToken", type: "text" },
                  { label: "Pickup Scheduled Date", name: "pickupScheduledDate", type: "date" },
                  { label: "Estimated Delivery Date", name: "estimatedDeliveryDate", type: "date" },
                  { label: "Expected Delivery Date", name: "expectedDeliveryDate", type: "date" },
                  { label: "Shipped Date", name: "shippedDate", type: "date" },
                  { label: "Delivered Date", name: "deliveredDate", type: "date" },
                  { label: "Label URL", name: "labelUrl", type: "text", className: "md:col-span-3" },
                  { label: "Track URL", name: "trackUrl", type: "text", className: "md:col-span-3" },
                ].map(field => (
                  <label key={field.name} className={`block ${field.className || ""}`}>
                    <span className="block text-xs text-gray-500 mb-1">{field.label}</span>
                    <input
                      type={field.type}
                      name={field.name}
                      value={editableShipmentFields[field.name as keyof EditableShipmentFields]}
                      onChange={handleEditableShipmentFieldChange}
                      className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    />
                  </label>
                ))}
              </div>

              <div className="border border-blue-100 rounded-lg p-3 bg-blue-50/40">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Shiprocket Step Status</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  {[
                    { label: "Shiprocket Order Status", name: "shiprocketOrderStatus" },
                    { label: "Generate AWB Status", name: "generateAwbStatus" },
                    { label: "Request Pickup Status", name: "requestPickupStatus" },
                    { label: "Generate Label Status", name: "generateLabelStatus" },
                    { label: "Track Shipment Status", name: "trackShipmentStatus" },
                    { label: "Estimate Status", name: "estimateStatus" },
                  ].map(field => (
                    <label key={field.name} className="block">
                      <span className="block text-xs text-gray-500 mb-1">{field.label}</span>
                      <select
                        name={field.name}
                        value={editableShipmentFields[field.name as keyof EditableShipmentFields]}
                        onChange={e => setEditableShipmentFields(prev => ({ ...prev, [field.name]: e.target.value }))}
                        className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-300"
                      >
                        <option value="">Select status</option>
                        <option value="SUCCESS">SUCCESS</option>
                        <option value="FAILED">FAILED</option>
                        <option value="SKIPPED">SKIPPED</option>
                      </select>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {createShipmentError && (
              <div className="mx-6 mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">{createShipmentError}</div>
            )}

            <div className="px-6 py-3 border-t bg-gray-50 rounded-b-2xl flex justify-end gap-3">
              <button onClick={closeCreateUpdateShipmentModal} disabled={creatingShipment}
                className="px-4 py-1.5 text-sm border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors">
                Close
              </button>
              <button onClick={handleCreateOrUpdateShipment} disabled={creatingShipment || orderShippingRecordsLoading || svcLoading}
                className="px-4 py-1.5 text-sm border border-blue-300 text-blue-700 rounded-xl hover:bg-blue-50 transition-colors disabled:opacity-60">
                {creatingShipment ? "Saving…" : "Create / Update Shipment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step Log Modal */}
      {stepLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={e => { if (e.target === e.currentTarget) setStepLogModal(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b bg-blue-500 rounded-t-2xl">
              <div>
                <h2 className="text-base font-bold text-white">{stepLogModal.stepLabel} — Log Details</h2>
                <p className="text-xs text-white/80 mt-0.5">Order {stepLogModal.shippingDetails.trackingNumber || `(Shipment ${stepLogModal.shippingDetails.shipmentId})`}</p>
              </div>
              <button onClick={() => setStepLogModal(null)} className="text-white/80 hover:text-white transition-colors">✕</button>
            </div>

            <div className="overflow-y-auto px-6 py-4">
              {stepLogModal.logs.length === 0 ? (
                <p className="text-sm text-gray-500">No logs available for this step.</p>
              ) : (
                <div className="space-y-3">
                  {stepLogModal.logs.map((log, idx) => (
                    <div key={log.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-xs text-gray-500">Attempt {idx + 1}</p>
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold mt-1 ${log.status === "SUCCESS" ? "bg-green-100 text-green-700" : log.status === "FAILURE" ? "bg-red-100 text-red-700" : log.status === "SKIPPED" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-600"}`}>
                            {log.status}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Created</p>
                          <p className="text-xs font-mono text-gray-700">{new Date(log.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
                        </div>
                      </div>
                      {log.remarks && (
                        <div className="mt-2 p-2 bg-white rounded border border-gray-200">
                          <p className="text-xs text-gray-600"><span className="font-semibold">Remarks:</span> {log.remarks}</p>
                        </div>
                      )}
                      {log.updatedAt && (
                        <p className="text-xs text-gray-400 mt-2">Updated: {new Date(log.updatedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t bg-gray-50 rounded-b-2xl flex justify-end">
              <button onClick={() => setStepLogModal(null)}
                className="px-4 py-1.5 text-sm border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shipment Logs Modal */}
      {shipmentLogsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={e => { if (e.target === e.currentTarget) setShipmentLogsModal(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b bg-green-500 rounded-t-2xl">
              <div>
                <h2 className="text-base font-bold text-white">Shipment Logs</h2>
                <p className="text-xs text-white/80 mt-0.5">Tracking: {shipmentLogsModal.shippingDetails.trackingNumber || `Shipment ${shipmentLogsModal.shippingDetails.shipmentId}`}</p>
              </div>
              <button onClick={() => setShipmentLogsModal(null)} className="text-white/80 hover:text-white transition-colors">✕</button>
            </div>

            <div className="overflow-y-auto px-6 py-4">
              {shipmentLogsModal.logs.length === 0 ? (
                <p className="text-sm text-gray-500">No shipment logs available.</p>
              ) : (
                <div className="space-y-3">
                  {shipmentLogsModal.logs.map((log, idx) => (
                    <div key={log.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-gray-800">{log.step}</p>
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              log.status === "SUCCESS" ? "bg-green-100 text-green-700" :
                              log.status === "FAILURE" ? "bg-red-100 text-red-700" :
                              log.status === "SKIPPED" ? "bg-yellow-100 text-yellow-700" :
                              log.status === "ATTEMPT_FAILED" ? "bg-orange-100 text-orange-700" :
                              log.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-700" :
                              "bg-gray-100 text-gray-600"
                            }`}>
                              {log.status}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Log ID: {log.id}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Created</p>
                          <p className="text-xs font-mono text-gray-700">{new Date(log.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                        {log.shiprocketOrderId && (
                          <div><span className="text-xs text-gray-500">Shiprocket Order ID</span><p className="font-mono text-gray-700">{log.shiprocketOrderId}</p></div>
                        )}
                        {log.shiprocketShipmentId && (
                          <div><span className="text-xs text-gray-500">Shiprocket Shipment ID</span><p className="font-mono text-gray-700">{log.shiprocketShipmentId}</p></div>
                        )}
                        {log.awbCode && (
                          <div><span className="text-xs text-gray-500">AWB Code</span><p className="font-mono text-gray-700">{log.awbCode}</p></div>
                        )}
                        {log.labelUrl && (
                          <div><span className="text-xs text-gray-500">Label URL</span><p className="font-mono text-blue-600"><a href={log.labelUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">View Label</a></p></div>
                        )}
                      </div>

                      {log.errorMessage && (
                        <div className="mt-2 p-2 bg-red-50 rounded border border-red-200">
                          <p className="text-xs text-red-700"><span className="font-semibold">Error/Remarks:</span> {log.errorMessage}</p>
                        </div>
                      )}

                      {log.updatedAt && (
                        <p className="text-xs text-gray-400 mt-2">Updated: {new Date(log.updatedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t bg-gray-50 rounded-b-2xl flex justify-end">
              <button onClick={() => setShipmentLogsModal(null)}
                className="px-4 py-1.5 text-sm border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminShippingManagementPage;
