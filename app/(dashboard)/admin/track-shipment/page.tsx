"use client";

import { DashboardSidebar } from "@/components";
import React, { useCallback, useEffect, useState } from "react";
import { showToast, showError } from "@/lib/toast";
import { API_BASE } from "@/lib/env";

interface TrackingHistory {
  status: string;
  location: string;
  remarks: string;
  date: string;
}

interface Shipment {
  shipmentId: number;
  orderNumber: string;
  orderId: number;
  trackingNumber: string;
  courierName: string;
  shipmentType: string;
  shipmentStatus: string;
  shippedDate: string | null;
  deliveredDate: string | null;
  createdAt: string;
  updatedAt: string;
  trackingHistory: TrackingHistory[];
}

const SHIPMENT_STATUS_OPTIONS = [
  "CREATED",
  "PICKED_UP",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "RETURN_PICKUP_INITIATED",
  "RECEIVED",
  "FAILED",
  "CANCELLED",
];

const statusBadgeColor = (status: string) => {
  switch (status?.toUpperCase()) {
    case "DELIVERED": return "bg-green-100 text-green-800";
    case "IN_TRANSIT": return "bg-blue-100 text-blue-800";
    case "OUT_FOR_DELIVERY": return "bg-indigo-100 text-indigo-800";
    case "PICKED_UP": return "bg-purple-100 text-purple-800";
    case "RECEIVED": return "bg-teal-100 text-teal-800";
    case "RETURN_PICKUP_INITIATED": return "bg-orange-100 text-orange-800";
    case "FAILED":
    case "CANCELLED": return "bg-red-100 text-red-800";
    case "CREATED": return "bg-gray-100 text-gray-700";
    default: return "bg-yellow-100 text-yellow-800";
  }
};

const AdminTrackShipmentPage = () => {
  const [orderNumberFilter, setOrderNumberFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [trackingDialog, setTrackingDialog] = useState<{ open: boolean; item: Shipment | null }>({ open: false, item: null });
  const [currentPage, setCurrentPage] = useState(1);
  const [updateStatus, setUpdateStatus] = useState("");
  const [updateLocation, setUpdateLocation] = useState("");
  const [updateRemarks, setUpdateRemarks] = useState("");
  const [updateLoading, setUpdateLoading] = useState(false);
  const pageSize = 10;

  const fetchShipments = useCallback(async (orderNum?: string, status?: string) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (orderNum && orderNum.trim()) params.append("orderNumber", orderNum.trim());
      if (status && status.trim()) params.append("status", status.trim());
      const res = await fetch(`${API_BASE}/api/api/shipments?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch shipments");
      const data = await res.json();
      const list = Array.isArray(data.shipments) ? data.shipments : [];
      setShipments(list);
      setCurrentPage(1);
    } catch (err: any) {
      setError(err.message || "Error fetching shipments");
      showError(err.message || "Error fetching shipments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchShipments(), 0);
    return () => clearTimeout(t);
  }, []);

  const handleUpdateStatus = async () => {
    if (!trackingDialog.item || !updateStatus.trim()) {
      showError("Please select a status.");
      return;
    }
    setUpdateLoading(true);
    try {
      const payload = {
        trackingNumber: trackingDialog.item.trackingNumber,
        status: updateStatus,
        location: updateLocation.trim(),
        remarks: updateRemarks.trim(),
        eventTime: new Date().toISOString(),
      };
      const res = await fetch(`${API_BASE}/api/api/shipment-status-update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || data?.status === "FAILURE") {
        throw new Error(data?.statusMessage || "Failed to update shipment status");
      }
      showToast(data?.statusMessage || "Shipment status updated successfully");
      setUpdateStatus("");
      setUpdateLocation("");
      setUpdateRemarks("");
      // refresh list and re-open with updated data
      await fetchShipments(orderNumberFilter, statusFilter);
      setTrackingDialog({ open: false, item: null });
    } catch (err: any) {
      showError(err.message || "Failed to update shipment status");
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleSearch = () => fetchShipments(orderNumberFilter, statusFilter);
  const handleClear = () => {
    setOrderNumberFilter("");
    setStatusFilter("");
    fetchShipments("", "");
  };

  const totalPages = Math.max(1, Math.ceil(shipments.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginated = shipments.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

  return (
    <div className="bg-white flex flex-col min-h-screen max-w-screen-2xl mx-auto">
      <DashboardSidebar />
      <div className="flex-1 p-6 overflow-auto">
        <h2 className="text-2xl font-bold mb-6">Track Shipments</h2>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Order Number</label>
            <input
              type="text"
              className="border rounded px-3 py-2 text-sm w-64"
              placeholder="e.g. ORD-260410112514-000040"
              value={orderNumberFilter}
              onChange={e => setOrderNumberFilter(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <select
              className="border rounded px-3 py-2 text-sm w-52"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              {SHIPMENT_STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            onClick={handleSearch}
          >
            Search
          </button>
          <button
            type="button"
            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 border"
            onClick={handleClear}
          >
            Clear
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-10 text-gray-500">Loading...</div>
        ) : error ? (
          <div className="text-center py-10 text-red-600">{error}</div>
        ) : shipments.length === 0 ? (
          <div className="text-center py-10 text-gray-500">No shipments found.</div>
        ) : (
          <>
            <div className="overflow-x-auto rounded border">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-700">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold">Order Number</th>
                    <th className="text-left px-4 py-3 font-semibold">Tracking Number</th>
                    <th className="text-left px-4 py-3 font-semibold">Courier</th>
                    <th className="text-left px-4 py-3 font-semibold">Type</th>
                    <th className="text-left px-4 py-3 font-semibold">Status</th>
                    <th className="text-left px-4 py-3 font-semibold">Created At</th>
                    <th className="text-left px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((item, idx) => (
                    <tr key={item.shipmentId} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{item.orderNumber}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-700 whitespace-nowrap">{item.trackingNumber}</td>
                      <td className="px-4 py-3 text-gray-700">{item.courierName}</td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{item.shipmentType}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${statusBadgeColor(item.shipmentStatus)}`}>
                          {item.shipmentStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">
                        {item.createdAt ? new Date(item.createdAt).toLocaleString() : "â€”"}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          className="text-xs text-blue-600 font-semibold hover:underline"
                          onClick={() => {
                            setUpdateStatus("");
                            setUpdateLocation("");
                            setUpdateRemarks("");
                            setTrackingDialog({ open: true, item });
                          }}
                        >
                          View Tracking
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-4 py-4">
                <button
                  className="px-3 py-1 text-sm rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={safeCurrentPage === 1}
                >
                  Â«
                </button>
                <span className="text-sm text-gray-600">Page {safeCurrentPage} of {totalPages}</span>
                <button
                  className="px-3 py-1 text-sm rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={safeCurrentPage === totalPages}
                >
                  Â»
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Tracking Details Popup */}
      {trackingDialog.open && trackingDialog.item && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold">Shipment Tracking Details</h3>
              <button
                type="button"
                className="text-sm text-gray-500 hover:text-gray-700"
                onClick={() => setTrackingDialog({ open: false, item: null })}
              >
                Close
              </button>
            </div>

            {/* Shipment info */}
            <div className="grid sm:grid-cols-2 gap-3 text-sm mb-6">
              <div><span className="font-semibold">Shipment ID:</span> {trackingDialog.item.shipmentId}</div>
              <div><span className="font-semibold">Order Number:</span> {trackingDialog.item.orderNumber}</div>
              <div className="sm:col-span-2">
                <span className="font-semibold">Tracking Number:</span>{" "}
                <span className="font-mono text-xs">{trackingDialog.item.trackingNumber}</span>
              </div>
              <div><span className="font-semibold">Courier:</span> {trackingDialog.item.courierName}</div>
              <div><span className="font-semibold">Type:</span> {trackingDialog.item.shipmentType}</div>
              <div>
                <span className="font-semibold">Status:</span>{" "}
                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${statusBadgeColor(trackingDialog.item.shipmentStatus)}`}>
                  {trackingDialog.item.shipmentStatus}
                </span>
              </div>
              <div>
                <span className="font-semibold">Shipped Date:</span>{" "}
                {trackingDialog.item.shippedDate ? new Date(trackingDialog.item.shippedDate).toLocaleString() : "â€”"}
              </div>
              <div>
                <span className="font-semibold">Delivered Date:</span>{" "}
                {trackingDialog.item.deliveredDate ? new Date(trackingDialog.item.deliveredDate).toLocaleString() : "â€”"}
              </div>
              <div>
                <span className="font-semibold">Created At:</span>{" "}
                {trackingDialog.item.createdAt ? new Date(trackingDialog.item.createdAt).toLocaleString() : "â€”"}
              </div>
              <div>
                <span className="font-semibold">Updated At:</span>{" "}
                {trackingDialog.item.updatedAt ? new Date(trackingDialog.item.updatedAt).toLocaleString() : "â€”"}
              </div>
            </div>

            {/* Tracking History Timeline */}
            {trackingDialog.item.trackingHistory && trackingDialog.item.trackingHistory.length > 0 ? (
              <div>
                <div className="font-semibold text-sm mb-3">Tracking History</div>
                <ol className="relative border-l border-gray-200 ml-3">
                  {trackingDialog.item.trackingHistory.map((h, i) => (
                    <li key={i} className="mb-5 ml-5">
                      <span className="absolute -left-2 flex items-center justify-center w-4 h-4 rounded-full bg-blue-500 ring-4 ring-white" />
                      <div className="flex flex-col gap-0.5">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold w-fit ${statusBadgeColor(h.status)}`}>
                          {h.status}
                        </span>
                        <span className="text-xs text-gray-500">
                          {h.date ? new Date(h.date).toLocaleString() : "â€”"}
                        </span>
                        {h.location && (
                          <span className="text-xs text-gray-700">
                            ðŸ“ {h.location}
                          </span>
                        )}
                        {h.remarks && (
                          <span className="text-xs text-gray-600 italic">{h.remarks}</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            ) : (
              <div className="text-sm text-gray-400 text-center py-4">No tracking history available.</div>
            )}

            {/* Update Status */}
            <div className="mt-6 border-t pt-5">
              <div className="font-semibold text-sm mb-3">Update Shipment Status</div>
              <div className="flex flex-col gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Status <span className="text-red-500">*</span></label>
                  <select
                    className="border rounded px-3 py-2 text-sm w-full"
                    value={updateStatus}
                    onChange={e => setUpdateStatus(e.target.value)}
                  >
                    <option value="">Select status</option>
                    {SHIPMENT_STATUS_OPTIONS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Location</label>
                  <input
                    type="text"
                    className="border rounded px-3 py-2 text-sm w-full"
                    placeholder="e.g. Bangalore"
                    value={updateLocation}
                    onChange={e => setUpdateLocation(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Remarks</label>
                  <textarea
                    className="border rounded px-3 py-2 text-sm w-full resize-y"
                    rows={2}
                    placeholder="Enter remarks..."
                    value={updateRemarks}
                    onChange={e => setUpdateRemarks(e.target.value)}
                  />
                </div>
                <div className="flex justify-center">
                  <button
                    type="button"
                    className="px-8 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 font-semibold disabled:opacity-60"
                    disabled={updateLoading}
                    onClick={handleUpdateStatus}
                  >
                    {updateLoading ? "Updating..." : "Update Status"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTrackShipmentPage;
