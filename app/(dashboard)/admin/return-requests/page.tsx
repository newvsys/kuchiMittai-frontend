"use client";

import { DashboardSidebar } from "@/components";
import React, { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { showToast, showError } from "@/lib/toast";
import { API_BASE } from "@/lib/env";

interface ReturnImage {
  id: number;
  imageUrl: string;
  imageType: string | null;
}

interface StatusHistory {
  id: number;
  newStatus: string;
  activityType: string | null;
  remarks: string;
  changedBy: string | null;
  changedAt: string;
}

interface ReturnPolicy {
  policyId?: number;
  name?: string;
  returnWindowDays?: number;
  isReturnable?: boolean;
  refundType?: string | null;
  returnMethod?: string | null;
  conditions?: Array<{
    id: number;
    policyId: number;
    conditionType: string;
    conditionValue: string;
  }>;
}

interface ReturnRequest {
  id: number;
  returnId: string;
  orderNumber: string;
  userId: number;
  returnType: string;
  reasonCode: string;
  reasonDescription?: string;
  status: string;
  userComments: string;
  carrier: string | null;
  reverseTrackingNumber: string | null;
  pickupScheduledDate: string | null;
  pickupCompletedDate: string | null;
  warehouseReceivedDate: string | null;
  qcStatus: string | null;
  qcRemarks: string | null;
  inspectedAt: string | null;
  refundAmount: number | null;
  paymentId: string | null;
  refundId: string | null;
  returnPolicy?: ReturnPolicy;
  images: ReturnImage[];
  statusHistory: StatusHistory[];
}

const STATUS_OPTIONS = [
  "REQUESTED",
  "APPROVED",
  "REJECTED",
  "PICKED_UP",
  "RECEIVED",
  "INSPECTED",
  "REFUND_INITIATED",
  "COMPLETED",
  "CANCELLED",
];

const AdminReturnRequestsPage = () => {
  const { data: session } = useSession();
  const [orderNumberFilter, setOrderNumberFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [detailsDialog, setDetailsDialog] = useState<{ open: boolean; item: ReturnRequest | null }>({ open: false, item: null });
  const [currentPage, setCurrentPage] = useState(1);
  const [approvalComment, setApprovalComment] = useState("");
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [returnPolicyPopup, setReturnPolicyPopup] = useState(false);
  const pageSize = 10;

  const fetchReturns = useCallback(async (orderNum?: string, status?: string) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (orderNum && orderNum.trim()) params.append("orderNumber", orderNum.trim());
      if (status && status.trim()) params.append("status", status.trim());
      const res = await fetch(`${API_BASE}/api/api/return-requests?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch return requests");
      const data = await res.json();
      setReturns(Array.isArray(data) ? data : []);
      setCurrentPage(1);
    } catch (err: any) {
      setError(err.message || "Error fetching return requests");
      showError(err.message || "Error fetching return requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchReturns(), 0);
    return () => clearTimeout(t);
  }, []);

  const handleApproveReject = async (status: "APPROVED" | "REJECTED") => {
    if (!detailsDialog.item || !session) return;
    setApprovalLoading(true);
    try {
      const payload = {
        returnId: detailsDialog.item.returnId,
        status,
        comments: approvalComment,
        userId: Number((session as any).user.id),
      };
      const res = await fetch(`${API_BASE}/api/api/return-requests/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || data?.responseStatus === "FAILURE") {
        throw new Error(data?.responseMessage || `Failed to ${status.toLowerCase()} return request`);
      }
      showToast(`Return request ${status.toLowerCase()} successfully.`);
      setDetailsDialog({ open: false, item: null });
      setApprovalComment("");
      fetchReturns(orderNumberFilter, statusFilter);
    } catch (err: any) {
      showError(err.message || `Failed to ${status.toLowerCase()} return request.`);
    } finally {
      setApprovalLoading(false);
    }
  };

  const handleSearch = () => {
    fetchReturns(orderNumberFilter, statusFilter);
  };

  const handleClear = () => {
    setOrderNumberFilter("");
    setStatusFilter("");
    fetchReturns("", "");
  };

  const totalPages = Math.max(1, Math.ceil(returns.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedReturns = returns.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

  const statusBadgeColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case "REQUESTED": return "bg-yellow-100 text-yellow-800";
      case "APPROVED": return "bg-green-100 text-green-800";
      case "REJECTED": return "bg-red-100 text-red-800";
      case "COMPLETED": return "bg-blue-100 text-blue-800";
      case "CANCELLED": return "bg-gray-100 text-gray-700";
      default: return "bg-purple-100 text-purple-800";
    }
  };

  return (
    <div className="bg-white flex flex-col min-h-screen max-w-screen-2xl mx-auto">
      <DashboardSidebar />
      <div className="flex-1 p-6 overflow-auto">
        <h2 className="text-2xl font-bold mb-6">Return Requests</h2>

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
              className="border rounded px-3 py-2 text-sm w-48"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map(s => (
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
        ) : returns.length === 0 ? (
          <div className="text-center py-10 text-gray-500">No return requests found.</div>
        ) : (
          <>
            <div className="overflow-x-auto rounded border">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-700">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold">#</th>
                    <th className="text-left px-4 py-3 font-semibold">Return ID</th>
                    <th className="text-left px-4 py-3 font-semibold">Order Number</th>
                    <th className="text-left px-4 py-3 font-semibold">Reason</th>
                    <th className="text-left px-4 py-3 font-semibold">Status</th>
                    <th className="text-left px-4 py-3 font-semibold">Images</th>
                    <th className="text-left px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedReturns.map((item, idx) => (
                    <tr key={item.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500">{(safeCurrentPage - 1) * pageSize + idx + 1}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-700">{item.returnId}</td>
                      <td className="px-4 py-3 text-gray-700">{item.orderNumber}</td>
                      <td className="px-4 py-3 text-gray-700">{item.reasonCode}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${statusBadgeColor(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{item.images?.length ?? 0}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          className="text-xs text-blue-600 font-semibold hover:underline"
                          onClick={() => { setDetailsDialog({ open: true, item }); setApprovalComment(""); }}
                        >
                          View / Approve
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

      {/* Details Dialog */}
      {detailsDialog.open && detailsDialog.item && (
        <>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold">Return Request Details</h3>
              <button
                type="button"
                className="text-sm text-gray-500 hover:text-gray-700"
                onClick={() => setDetailsDialog({ open: false, item: null })}
              >
                Close
              </button>
            </div>

            {/* Core info */}
            <div className="grid sm:grid-cols-2 gap-3 text-sm mb-5">
              <div><span className="font-semibold">Return ID:</span> <span className="font-mono text-xs">{detailsDialog.item.returnId}</span></div>
              <div><span className="font-semibold">Order Number:</span> {detailsDialog.item.orderNumber}</div>
              <div><span className="font-semibold">Return Type:</span> {detailsDialog.item.returnType}</div>
              <div><span className="font-semibold">Return Reason:</span> {detailsDialog.item.reasonDescription || detailsDialog.item.reasonCode || "â€”"}</div>
              <div>
                <span className="font-semibold">Status:</span>{" "}
                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${statusBadgeColor(detailsDialog.item.status)}`}>
                  {detailsDialog.item.status}
                </span>
              </div>
              <div><span className="font-semibold">Carrier:</span> {detailsDialog.item.carrier || "â€”"}</div>
              <div><span className="font-semibold">Tracking #:</span> {detailsDialog.item.reverseTrackingNumber || "â€”"}</div>
              <div><span className="font-semibold">Pickup Scheduled:</span> {detailsDialog.item.pickupScheduledDate || "â€”"}</div>
              <div><span className="font-semibold">Pickup Completed:</span> {detailsDialog.item.pickupCompletedDate || "â€”"}</div>
              <div><span className="font-semibold">Warehouse Received:</span> {detailsDialog.item.warehouseReceivedDate || "â€”"}</div>
              <div><span className="font-semibold">QC Status:</span> {detailsDialog.item.qcStatus || "â€”"}</div>
              <div><span className="font-semibold">QC Remarks:</span> {detailsDialog.item.qcRemarks || "â€”"}</div>
              <div><span className="font-semibold">Refund Amount:</span> {detailsDialog.item.refundAmount != null ? detailsDialog.item.refundAmount : "â€”"}</div>
              {detailsDialog.item.userComments && (
                <div className="sm:col-span-2"><span className="font-semibold">Comments:</span> {detailsDialog.item.userComments}</div>
              )}
              {detailsDialog.item.returnPolicy && (
                <div className="sm:col-span-2">
                  <button
                    type="button"
                    className="text-sm text-blue-600 font-semibold hover:underline"
                    onClick={() => setReturnPolicyPopup(true)}
                  >
                    View Return Policy
                  </button>
                </div>
              )}
            </div>

            {/* Images */}
            {detailsDialog.item.images && detailsDialog.item.images.length > 0 && (
              <div className="mb-5">
                <div className="font-semibold text-sm mb-2">Uploaded Images</div>
                <div className="grid grid-cols-3 gap-2">
                  {detailsDialog.item.images.map(img => {
                    const src = img.imageUrl.startsWith("/public/")
                      ? img.imageUrl.replace("/public", "")
                      : img.imageUrl;
                    return (
                      <a key={img.id} href={src} target="_blank" rel="noopener noreferrer">
                        <img
                          src={src}
                          alt={`Return image ${img.id}`}
                          className="w-full h-24 object-cover rounded border hover:opacity-80"
                          onError={e => { (e.target as HTMLImageElement).src = "/product_placeholder.jpg"; }}
                        />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Status History */}
            {detailsDialog.item.statusHistory && detailsDialog.item.statusHistory.length > 0 && (
              <div>
                <div className="font-semibold text-sm mb-2">Status History</div>
                <table className="w-full text-xs border rounded overflow-hidden">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-gray-700">Status</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-700">Remarks</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-700">Changed At</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-700">Changed By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailsDialog.item.statusHistory.map(h => (
                      <tr key={h.id} className="border-t">
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${statusBadgeColor(h.newStatus)}`}>
                            {h.newStatus}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-gray-700">{h.remarks || "â€”"}</td>
                        <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                          {h.changedAt ? new Date(h.changedAt).toLocaleString() : "â€”"}
                        </td>
                        <td className="px-3 py-2 text-gray-600">{h.changedBy || "â€”"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Approve / Reject */}
            {["REQUESTED"].includes((detailsDialog.item.status || "").toUpperCase()) && (
              <div className="mt-6 border-t pt-5">
                <div className="font-semibold text-sm mb-2">Approve / Reject</div>
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Comments</label>
                  <textarea
                    className="w-full border rounded px-3 py-2 text-sm resize-y"
                    rows={3}
                    placeholder="Enter comments..."
                    value={approvalComment}
                    onChange={e => setApprovalComment(e.target.value)}
                  />
                </div>
                <div className="flex justify-center gap-4 mt-2">
                  <button
                    type="button"
                    className="px-8 py-2 text-sm rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-60 font-semibold"
                    disabled={approvalLoading}
                    onClick={() => handleApproveReject("APPROVED")}
                  >
                    {approvalLoading ? "Processing..." : "Approve"}
                  </button>
                  <button
                    type="button"
                    className="px-8 py-2 text-sm rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 font-semibold"
                    disabled={approvalLoading}
                    onClick={() => handleApproveReject("REJECTED")}
                  >
                    {approvalLoading ? "Processing..." : "Reject"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Return Policy Popup â€” rendered inside details dialog for correct stacking */}
        {returnPolicyPopup && detailsDialog.item?.returnPolicy && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-6">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-semibold">Return Policy Details</h3>
                <button
                  type="button"
                  className="text-sm text-gray-500 hover:text-gray-700"
                  onClick={() => setReturnPolicyPopup(false)}
                >
                  Close
                </button>
              </div>
              <div className="border rounded p-4 text-sm">
                {detailsDialog.item.returnPolicy.name && (
                  <div className="font-semibold text-gray-900 mb-2">{detailsDialog.item.returnPolicy.name}</div>
                )}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-gray-700 mb-4">
                  <div>
                    <span className="font-medium">Returnable:</span>{" "}
                    <span className={detailsDialog.item.returnPolicy.isReturnable ? "text-green-600 font-semibold" : "text-red-500 font-semibold"}>
                      {detailsDialog.item.returnPolicy.isReturnable ? "Yes" : "No"}
                    </span>
                  </div>
                  {detailsDialog.item.returnPolicy.returnWindowDays != null && (
                    <div>
                      <span className="font-medium">Return Window:</span> {detailsDialog.item.returnPolicy.returnWindowDays} days
                    </div>
                  )}
                  {detailsDialog.item.returnPolicy.refundType && (
                    <div>
                      <span className="font-medium">Refund Type:</span> {detailsDialog.item.returnPolicy.refundType}
                    </div>
                  )}
                  {detailsDialog.item.returnPolicy.returnMethod && (
                    <div>
                      <span className="font-medium">Return Method:</span> {detailsDialog.item.returnPolicy.returnMethod}
                    </div>
                  )}
                </div>
                {detailsDialog.item.returnPolicy.conditions && detailsDialog.item.returnPolicy.conditions.length > 0 && (
                  <div>
                    <div className="font-medium text-gray-800 mb-2 text-xs">Conditions</div>
                    <table className="w-full text-xs border rounded overflow-hidden">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium text-gray-700">Condition Type</th>
                          <th className="text-left px-3 py-2 font-medium text-gray-700">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailsDialog.item.returnPolicy.conditions.map(cond => (
                          <tr key={cond.id} className="border-t">
                            <td className="px-3 py-2 text-gray-700">{cond.conditionType}</td>
                            <td className="px-3 py-2 text-gray-700">{cond.conditionValue}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        </>
      )}
    </div>
  );
};

export default AdminReturnRequestsPage;
