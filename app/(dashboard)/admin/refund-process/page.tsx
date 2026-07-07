"use client";

import { DashboardSidebar } from "@/components";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { FaRegCalendarAlt } from "react-icons/fa";
import { FiCopy } from "react-icons/fi";
import { FiXCircle } from "react-icons/fi";
import { showToast, showError } from "@/lib/toast";
import { API_BASE } from "@/lib/env";

type RefundStatus = "INITIATED" | "FAILED" | "SUCCESS" | "APPROVED";

interface RefundItem {
  refundTransactionId: number;
  refundReference: string;
  status: RefundStatus | string;
  failureReason?: string | null;
  requestedAmount?: number | null;
  approvedAmount?: number | null;
  refundedAmount?: number | null;
  customerName?: string | null;
  customerMobile: string;
  order?: {
    orderNumber?: string;
    orderStatus?: string;
    totalAmount?: number | null;
    items?: Array<{
      productName?: string;
      quantity?: number;
      unitPrice?: number;
      totalPrice?: number;
    }>;
  };
}

const STATUS_OPTIONS: RefundStatus[] = [
  "INITIATED",
  "FAILED",
  "SUCCESS",
  "APPROVED",
];

const AdminRefundProcessPage = () => {
  const [selectedStatuses, setSelectedStatuses] = useState<RefundStatus[]>([]);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState<boolean>(false);
  const [createdFrom, setCreatedFrom] = useState<string>("");
  const [createdTo, setCreatedTo] = useState<string>("");
  const [orderNumber, setOrderNumber] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedRefund, setSelectedRefund] = useState<RefundItem | null>(null);
  const [approvedAmountInput, setApprovedAmountInput] = useState<string>("");
  const [isApprovedAmountReadOnly, setIsApprovedAmountReadOnly] = useState<boolean>(false);
  const [approveLoading, setApproveLoading] = useState<boolean>(false);
  const [reinitiateLoading, setReinitiateLoading] = useState<boolean>(false);

  const [refunds, setRefunds] = useState<RefundItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [dateErrors, setDateErrors] = useState<{ createdFrom?: string; createdTo?: string }>(
    {}
  );
  const statusDropdownRef = useRef<HTMLDivElement | null>(null);
  const createdFromPickerRef = useRef<HTMLInputElement | null>(null);
  const createdToPickerRef = useRef<HTMLInputElement | null>(null);
  const pageSize = 10;

  const baseUrl = API_BASE;

  const buildStartOfDay = (value: string) => {
    if (!value) return "";
    return `${value}T00:00:00`;
  };

  const buildEndOfDay = (value: string) => {
    if (!value) return "";
    return `${value}T23:59:59`;
  };

  const isValidDateFormat = (value: string) => {
    if (!value) return true;
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(value)) return false;

    const [yearStr, monthStr, dayStr] = value.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);

    const date = new Date(year, month - 1, day);
    return (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    );
  };

  const validateDateFilters = () => {
    const nextErrors: { createdFrom?: string; createdTo?: string } = {};

    if (createdFrom && !isValidDateFormat(createdFrom)) {
      nextErrors.createdFrom = "Use format YYYY-MM-DD";
    }

    if (createdTo && !isValidDateFormat(createdTo)) {
      nextErrors.createdTo = "Use format YYYY-MM-DD";
    }

    if (
      !nextErrors.createdFrom &&
      !nextErrors.createdTo &&
      createdFrom &&
      createdTo &&
      createdFrom > createdTo
    ) {
      nextErrors.createdTo = "Date To should be same or after Date From";
    }

    setDateErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const openDatePicker = (pickerRef: React.RefObject<HTMLInputElement | null>) => {
    const input = pickerRef.current;
    if (!input) return;

    const maybeShowPicker = input as HTMLInputElement & { showPicker?: () => void };
    if (typeof maybeShowPicker.showPicker === "function") {
      maybeShowPicker.showPicker();
    } else {
      input.focus();
      input.click();
    }
  };

  const fetchRefunds = async () => {
    if (!validateDateFilters()) {
      setError("Please correct date filters");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      selectedStatuses.forEach((item) => {
        if (item) params.append("status", item);
      });
      if (createdFrom) params.append("createdFrom", buildStartOfDay(createdFrom));
      if (createdTo) params.append("createdTo", buildEndOfDay(createdTo));
      if (orderNumber.trim()) params.append("orderNumber", orderNumber.trim());

      const query = params.toString();
      const endpoint = `${baseUrl}/api/refunds${query ? `?${query}` : ""}`;

      const res = await fetch(endpoint, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("Failed to fetch refund details");
      }

      const data = await res.json();
      setRefunds(Array.isArray(data) ? data : []);
      setCurrentPage(1);
    } catch (err: any) {
      setError(err?.message || "Unable to load refund details");
      setRefunds([]);
      setCurrentPage(1);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = (value: RefundStatus) => {
    setSelectedStatuses((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const statusSummary =
    selectedStatuses.length === 0
      ? "All"
      : selectedStatuses.length <= 2
      ? selectedStatuses.join(", ")
      : `${selectedStatuses.length} selected`;

  useEffect(() => {
    const t = setTimeout(() => fetchRefunds(), 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        statusDropdownRef.current &&
        !statusDropdownRef.current.contains(event.target as Node)
      ) {
        setIsStatusDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!selectedRefund) {
      setApprovedAmountInput("");
      setIsApprovedAmountReadOnly(false);
      return;
    }

    const hasApprovedAmount =
      selectedRefund.approvedAmount !== null &&
      selectedRefund.approvedAmount !== undefined &&
      String(selectedRefund.approvedAmount).trim() !== "";

    if (hasApprovedAmount) {
      setApprovedAmountInput(String(selectedRefund.approvedAmount));
      setIsApprovedAmountReadOnly(false);
    } else {
      setApprovedAmountInput(
        selectedRefund.requestedAmount !== null && selectedRefund.requestedAmount !== undefined
          ? String(selectedRefund.requestedAmount)
          : ""
      );
      setIsApprovedAmountReadOnly(true);
    }
  }, [selectedRefund]);

  const handleReset = () => {
    setSelectedStatuses([]);
    setIsStatusDropdownOpen(false);
    setCreatedFrom("");
    setCreatedTo("");
    setOrderNumber("");
    setDateErrors({});
    setError("");
    setCurrentPage(1);
  };

  const handleCopyToClipboard = async (value: string, fieldLabel: string) => {
    if (!value || value === "-") {
      showError(`${fieldLabel} is not available to copy`);
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      showToast(`${fieldLabel} copied`, {
        id: "copy-toast",
        duration: 500,
        removeDelay: 0,
      });
    } catch {
      showError("Failed to copy");
    }
  };

  const handleApproveAndInitiatePayment = async () => {
    if (!selectedRefund?.refundReference) {
      showError("Refund reference is missing");
      return;
    }

    if ((selectedRefund.status || "").toString().toUpperCase() !== "INITIATED") {
      showError("Approve action is allowed only for INITIATED refunds");
      return;
    }

    const approvedAmount = Number(approvedAmountInput);
    if (!approvedAmountInput || Number.isNaN(approvedAmount) || approvedAmount <= 0) {
      showError("Please enter a valid approved amount");
      return;
    }

    const requestedAmount = Number(selectedRefund.requestedAmount);
    if (
      selectedRefund.requestedAmount === null ||
      selectedRefund.requestedAmount === undefined ||
      Number.isNaN(requestedAmount)
    ) {
      showError("Requested amount is not available");
      return;
    }

    if (approvedAmount !== requestedAmount) {
      showError("Approved amount must be same as requested amount");
      return;
    }

    try {
      setApproveLoading(true);

      const res = await fetch(`${baseUrl}/api/refunds/approve`, {
        method: "POST",
        headers: {
          accept: "*/*",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          refundReference: selectedRefund.refundReference,
          approvedAmount,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || data?.responseStatus === "FAILURE") {
        throw new Error("Failed to approve and Initiate the payment.");
      }

      showToast("Successful approve and initiate the payment.");

      // Close popup and reload latest data from backend
      setSelectedRefund(null);
      await fetchRefunds();
    } catch (err: any) {
      showError("Failed to approve and Initiate the payment.");
    } finally {
      setApproveLoading(false);
    }
  };

  const handleReinitiateRefund = async () => {
    if (!selectedRefund?.refundReference) {
      showError("Refund reference is missing");
      return;
    }

    try {
      setReinitiateLoading(true);

      const refundReferenceNo = encodeURIComponent(selectedRefund.refundReference);
      const res = await fetch(
        `${baseUrl}/api/refund?refundReferenceNo=${refundReferenceNo}`,
        {
          method: "POST",
          headers: {
            accept: "*/*",
          },
        }
      );

      const data = await res.json().catch(() => null);

      if (!res.ok || data?.responseStatus === "FAILURE") {
        throw new Error(data?.responseMessage || "Failed to reinitiate refund");
      }

      showToast(data?.responseMessage || "Refund reinitiated successfully.");
      setSelectedRefund(null);
      await fetchRefunds();
    } catch (err: any) {
      showError(err?.message || "Failed to reinitiate refund");
    } finally {
      setReinitiateLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(refunds.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedRefunds = refunds.slice(startIndex, startIndex + pageSize);

  return (
    <div className="bg-white flex flex-col min-h-screen max-w-screen-2xl mx-auto">
      <DashboardSidebar />
      <div className="flex flex-col w-full p-6 max-xl:p-4">
        <h1 className="text-2xl font-semibold text-blue-600">Refund Process</h1>

        <div className="mt-6 rounded-lg border border-gray-200 p-4 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Refund Ref/Order No</label>
              <input
                type="text"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder=""
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="md:max-w-[180px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
              <div className="relative">
                <input
                  type="text"
                  value={createdFrom}
                  onChange={(e) => setCreatedFrom(e.target.value)}
                  onBlur={validateDateFilters}
                  placeholder="YYYY-MM-DD"
                  className="w-full rounded border border-gray-300 px-3 py-2 pr-10 text-sm"
                />
                <button
                  type="button"
                  onClick={() => openDatePicker(createdFromPickerRef)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-600"
                  aria-label="Open Date From calendar"
                >
                  <FaRegCalendarAlt />
                </button>
                <input
                  ref={createdFromPickerRef}
                  type="date"
                  value={createdFrom}
                  onChange={(e) => {
                    setCreatedFrom(e.target.value);
                    setTimeout(() => validateDateFilters(), 0);
                  }}
                  className="absolute opacity-0 pointer-events-none w-0 h-0"
                  tabIndex={-1}
                  aria-hidden="true"
                />
              </div>
              {dateErrors.createdFrom && (
                <p className="text-xs text-red-600 mt-1">{dateErrors.createdFrom}</p>
              )}
            </div>

            <div className="md:max-w-[180px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
              <div className="relative">
                <input
                  type="text"
                  value={createdTo}
                  onChange={(e) => setCreatedTo(e.target.value)}
                  onBlur={validateDateFilters}
                  placeholder="YYYY-MM-DD"
                  className="w-full rounded border border-gray-300 px-3 py-2 pr-10 text-sm"
                />
                <button
                  type="button"
                  onClick={() => openDatePicker(createdToPickerRef)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-600"
                  aria-label="Open Date To calendar"
                >
                  <FaRegCalendarAlt />
                </button>
                <input
                  ref={createdToPickerRef}
                  type="date"
                  value={createdTo}
                  onChange={(e) => {
                    setCreatedTo(e.target.value);
                    setTimeout(() => validateDateFilters(), 0);
                  }}
                  className="absolute opacity-0 pointer-events-none w-0 h-0"
                  tabIndex={-1}
                  aria-hidden="true"
                />
              </div>
              {dateErrors.createdTo && (
                <p className="text-xs text-red-600 mt-1">{dateErrors.createdTo}</p>
              )}
            </div>

            <div className="md:max-w-[170px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Refund Status</label>
              <div className="relative" ref={statusDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsStatusDropdownOpen((prev) => !prev)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm bg-white text-left"
                >
                  {statusSummary}
                </button>
                {isStatusDropdownOpen && (
                  <div className="absolute z-20 mt-1 w-full rounded border border-gray-300 bg-white shadow-md p-2 max-h-44 overflow-y-auto">
                    {STATUS_OPTIONS.map((item) => (
                      <label key={item} className="flex items-center gap-2 py-1 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedStatuses.includes(item)}
                          onChange={() => toggleStatus(item)}
                        />
                        <span>{item}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-end xl:justify-end">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={fetchRefunds}
                  className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  Search
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                >
                  <FiXCircle className="text-sm" />
                  <span>Clear All</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Refund Reference</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Refund Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Requested Amount</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Approved Amount</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Refunded Amount</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Order Number</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">
                    Loading refund details...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-red-600">
                    {error}
                  </td>
                </tr>
              ) : refunds.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">
                    No refund records found.
                  </td>
                </tr>
              ) : (
                paginatedRefunds.map((refund) => (
                  <tr key={refund.refundTransactionId} className="border-t border-gray-100">
                    <td className="px-4 py-3 text-sm text-gray-800">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedRefund(refund)}
                          className="text-blue-600 hover:underline"
                        >
                          {refund.refundReference || "-"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyToClipboard(refund.refundReference || "", "Refund reference")}
                          className="text-gray-500 hover:text-blue-600"
                          aria-label="Copy refund reference"
                          title="Copy"
                        >
                          <FiCopy className="text-sm" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800">{refund.status || "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-800">{refund.requestedAmount ?? "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-800">{refund.approvedAmount ?? "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-800">{refund.refundedAmount ?? "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-800">
                      <div className="flex items-center gap-2">
                        <span>{refund.order?.orderNumber || "-"}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyToClipboard(refund.order?.orderNumber || "", "Order number")}
                          className="text-gray-500 hover:text-blue-600"
                          aria-label="Copy order number"
                          title="Copy"
                        >
                          <FiCopy className="text-sm" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && !error && refunds.length > 0 && (
          <div className="mt-4 flex items-center justify-between text-sm">
            <p className="text-gray-600">
              Showing {startIndex + 1}-{Math.min(startIndex + pageSize, refunds.length)} of {refunds.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={safeCurrentPage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-gray-700">
                Page {safeCurrentPage} of {totalPages}
              </span>
              <button
                type="button"
                disabled={safeCurrentPage === totalPages}
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {selectedRefund && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-4xl bg-white rounded-lg shadow-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b px-5 py-3">
                <h2 className="text-lg font-semibold text-blue-700">Refund Details</h2>
                <button
                  type="button"
                  onClick={() => setSelectedRefund(null)}
                  className="text-gray-500 hover:text-gray-700 text-xl leading-none"
                  aria-label="Close refund details popup"
                >
                  Ã—
                </button>
              </div>

              <div className="p-5 space-y-5">
                <div className="text-sm">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <p><span className="font-semibold">Customer Name:</span> {selectedRefund.customerName || "-"}</p>
                    <p><span className="font-semibold">Customer Mobile:</span> {selectedRefund.customerMobile || "-"}</p>
                  </div>
                </div>

                <div className="text-sm">
                  <p className="mb-2"><span className="font-semibold">Order Number:</span> {selectedRefund.order?.orderNumber || "-"}</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <p><span className="font-semibold">Order Status:</span> {selectedRefund.order?.orderStatus || "-"}</p>
                    <p><span className="font-semibold">Total Amount:</span> {selectedRefund.order?.totalAmount ?? "-"}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold mb-2 text-sm">Order Items</h3>
                  <div className="overflow-x-auto border rounded">
                    <table className="min-w-full text-sm bg-white">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-3 py-2 text-left">Product Name</th>
                          <th className="px-3 py-2 text-left">Quantity</th>
                          <th className="px-3 py-2 text-left">Unit Price</th>
                          <th className="px-3 py-2 text-left">Total Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(selectedRefund.order?.items || []).length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-3 py-3 text-center text-gray-500">
                              No order items available.
                            </td>
                          </tr>
                        ) : (
                          selectedRefund.order?.items?.map((item, index) => (
                            <tr key={`${selectedRefund.refundTransactionId}-${index}`} className="border-t">
                              <td className="px-3 py-2">{item.productName || "-"}</td>
                              <td className="px-3 py-2">{item.quantity ?? "-"}</td>
                              <td className="px-3 py-2">{item.unitPrice ?? "-"}</td>
                              <td className="px-3 py-2">{item.totalPrice ?? "-"}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="text-sm">
                  <p className="mb-2"><span className="font-semibold">Refund Reference:</span> {selectedRefund.refundReference || "-"}</p>
                  <p className="mb-2"><span className="font-semibold">Failure Reason:</span> {selectedRefund.failureReason || "-"}</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <p><span className="font-semibold">Refund Status:</span> {selectedRefund.status || "-"}</p>
                    <p><span className="font-semibold">Requested Amount:</span> {selectedRefund.requestedAmount ?? "-"}</p>
                    <div>
                      <label className="font-semibold block mb-1">Approved Amount:</label>
                      <input
                        type="text"
                        value={approvedAmountInput}
                        onChange={(e) => setApprovedAmountInput(e.target.value)}
                        readOnly={isApprovedAmountReadOnly}
                        className="w-full rounded border border-gray-300 px-2 py-1 read-only:bg-gray-100 read-only:text-gray-600"
                        placeholder="Enter approved amount"
                      />
                    </div>
                    <p><span className="font-semibold">Refunded Amount:</span> {selectedRefund.refundedAmount ?? "-"}</p>
                  </div>
                  <div className="mt-4 flex justify-center">
                    {(selectedRefund.status || "").toString().toUpperCase() === "FAILED" ? (
                      <button
                        type="button"
                        onClick={handleReinitiateRefund}
                        disabled={reinitiateLoading}
                        className="px-4 py-2 bg-amber-600 text-white rounded text-sm hover:bg-amber-700"
                      >
                        {reinitiateLoading ? "Processing..." : "Reinitiate Refund"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleApproveAndInitiatePayment}
                        disabled={
                          approveLoading ||
                          (
                            (selectedRefund.status || "").toString().toUpperCase() !== "INITIATED" &&
                            (selectedRefund.order?.orderStatus || "").toString().toUpperCase() !== "RETURN_IN_PROGRESS"
                          )
                        }
                        className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {approveLoading ? "Processing..." : "Approve & Initiate Payment"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminRefundProcessPage;
