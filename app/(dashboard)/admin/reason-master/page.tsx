"use client";

import { DashboardSidebar } from "@/components";
import React, { useEffect, useState } from "react";
import { showToast, showError } from "@/lib/toast";
import apiClient from "@/lib/api";

const REASON_TYPES = ["ORDER-CANCEL", "ORDER-RETURN"] as const;
type ReasonType = (typeof REASON_TYPES)[number];

interface Reason {
  id: number;
  reasonCode: string;
  reasonDescription: string;
  type: string;
  status: string;
}

interface ReasonFormState {
  reasonDescription: string;
  type: ReasonType;
}

const emptyForm: ReasonFormState = {
  reasonDescription: "",
  type: "ORDER-CANCEL",
};

const TYPE_PREFIX: Record<string, string> = {
  "ORDER-CANCEL": "CANCEL",
  "ORDER-RETURN": "RETURN",
};

const generateUniqueReasonCode = async (type: ReasonType): Promise<string> => {
  const prefix = TYPE_PREFIX[type] ?? type.replace("ORDER-", "");
  const res = await apiClient.get(`/api/reasons?type=${encodeURIComponent(type)}`);
  const data = res.ok ? await res.json() : { reasons: [] };
  const existingCodes = new Set<string>(
    (data.reasons || []).map((r: { reasonCode: string }) => r.reasonCode)
  );
  let counter = 1;
  let code: string;
  do {
    code = `${prefix}_${String(counter).padStart(3, "0")}`;
    counter++;
  } while (existingCodes.has(code));
  return code;
};

const AdminReasonMasterPage = () => {
  const [reasons, setReasons] = useState<Reason[]>([]);
  const [loading, setLoading] = useState(false);

  const [typeFilter, setTypeFilter] = useState<"" | ReasonType>("");
  const [statusFilter, setStatusFilter] = useState<"" | "A" | "I">("");

  const [formDialog, setFormDialog] = useState<{
    open: boolean;
    mode: "add" | "edit";
    reasonId: number | null;
  }>({ open: false, mode: "add", reasonId: null });

  const [form, setForm] = useState<ReasonFormState>(emptyForm);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    reason: Reason | null;
  }>({ open: false, reason: null });
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchReasons = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append("status", statusFilter);
      if (typeFilter) params.append("type", typeFilter);
      const query = params.toString();
      const res = await apiClient.get(`/api/reasons${query ? `?${query}` : ""}`);
      if (!res.ok) throw new Error("Failed to fetch reasons");
      const data = await res.json();
      setReasons(data.reasons || []);
    } catch (err: any) {
      showError(err.message || "Failed to fetch reasons");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReasons();
  }, [statusFilter, typeFilter]);

  const openAdd = () => {
    setForm(emptyForm);
    setFormError("");
    setFormDialog({ open: true, mode: "add", reasonId: null });
  };

  const openEdit = (reason: Reason) => {
    setFormError("");
    setForm({
      reasonDescription: reason.reasonDescription,
      type: REASON_TYPES.includes(reason.type as ReasonType)
        ? (reason.type as ReasonType)
        : "ORDER-CANCEL",
    });
    setFormDialog({ open: true, mode: "edit", reasonId: reason.id });
  };

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);
    try {
      let res: Response;
      if (formDialog.mode === "add") {
        const reasonCode = await generateUniqueReasonCode(form.type);
        res = await apiClient.post("/api/create-reason", {
          reasonCode,
          reasonDescription: form.reasonDescription.trim(),
          type: form.type,
        });
      } else {
        res = await apiClient.put(`/api/api/reason/${formDialog.reasonId}`, {
          reasonDescription: form.reasonDescription.trim(),
          type: form.type,
        });
      }

      const data = await res.json();
      if (!res.ok || (data.responseStatus && data.responseStatus.toUpperCase() === "FAILURE")) {
        throw new Error(data.responseMessage || "Operation failed");
      }

      showToast(data.responseMessage || (formDialog.mode === "add" ? "Reason created" : "Reason updated"));
      setFormDialog({ open: false, mode: "add", reasonId: null });
      fetchReasons();
    } catch (err: any) {
      setFormError(err.message || "Operation failed");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeactivate = async () => {
    if (!deleteDialog.reason) return;
    setDeleteLoading(true);
    try {
      const res = await apiClient.request(`/api/api/reason/${deleteDialog.reason.id}`, {
        method: "DELETE",
        body: JSON.stringify({ status: "I" }),
      });
      const data = await res.json();
      if (!res.ok || data.responseStatus === "FAILURE") {
        throw new Error(data.responseMessage || "Deactivation failed");
      }
      showToast(data.responseMessage || "Reason deactivated");
      setDeleteDialog({ open: false, reason: null });
      fetchReasons();
    } catch (err: any) {
      showError(err.message || "Deactivation failed");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardSidebar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Reason Master</h1>
          <button
            type="button"
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            onClick={openAdd}
          >
            + Add Reason
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">Type:</span>
            {([["", "All"], ["ORDER-CANCEL", "Order Cancel"], ["ORDER-RETURN", "Order Return"]] as const).map(
              ([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setTypeFilter(val as "" | ReasonType)}
                  className={`px-3 py-1 text-xs rounded border font-medium transition-colors ${
                    typeFilter === val
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {label}
                </button>
              )
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">Status:</span>
            {([["", "All"], ["A", "Active"], ["I", "Inactive"]] as const).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setStatusFilter(val as "" | "A" | "I")}
                className={`px-3 py-1 text-xs rounded border font-medium transition-colors ${
                  statusFilter === val
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-16 text-gray-500 text-sm">Loading...</div>
        ) : reasons.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">No reasons found.</div>
        ) : (
          <div className="overflow-x-auto rounded border bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">ID</th>
                  <th className="px-4 py-3 text-left font-semibold">Reason Code</th>
                  <th className="px-4 py-3 text-left font-semibold">Description</th>
                  <th className="px-4 py-3 text-left font-semibold">Type</th>
                  <th className="px-4 py-3 text-center font-semibold">Status</th>
                  <th className="px-4 py-3 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reasons.map((r, idx) => (
                  <tr
                    key={r.id}
                    className={`border-t ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50 transition-colors`}
                  >
                    <td className="px-4 py-3 text-gray-500">{r.id}</td>
                    <td className="px-4 py-3 font-mono text-gray-800">{r.reasonCode}</td>
                    <td className="px-4 py-3 text-gray-700">{r.reasonDescription}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                        {r.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          r.status === "A"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-600"
                        }`}
                      >
                        {r.status === "A" ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          className="text-xs px-3 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 font-medium"
                          onClick={() => openEdit(r)}
                        >
                          Edit
                        </button>
                        {r.status === "A" && (
                          <button
                            type="button"
                            className="text-xs px-3 py-1 rounded bg-red-100 text-red-600 hover:bg-red-200 font-medium"
                            onClick={() => setDeleteDialog({ open: true, reason: r })}
                          >
                            Deactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Dialog */}
      {formDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {formDialog.mode === "add" ? "Add Reason" : "Edit Reason"}
              </h3>
              <button
                type="button"
                className="text-sm text-gray-500 hover:text-gray-700"
                onClick={() => setFormDialog({ open: false, mode: "add", reasonId: null })}
              >
                Close
              </button>
            </div>

            {formError && (
              <p className="text-sm text-red-600 mb-3">{formError}</p>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="reasonDescription"
                  value={form.reasonDescription}
                  onChange={handleFormChange}
                  required
                  rows={3}
                  placeholder="e.g. Product not needed anymore"
                  className="w-full border rounded px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="type"
                  value={form.type}
                  onChange={handleFormChange}
                  required
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  {REASON_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="px-4 py-1.5 text-sm rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                  onClick={() => setFormDialog({ open: false, mode: "add", reasonId: null })}
                  disabled={formLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                  disabled={formLoading}
                >
                  {formLoading
                    ? formDialog.mode === "add" ? "Creating..." : "Saving..."
                    : formDialog.mode === "add" ? "Create" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deactivate Confirmation Dialog */}
      {deleteDialog.open && deleteDialog.reason && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold mb-2">Deactivate Reason</h3>
            <p className="text-sm text-gray-700 mb-1">
              Are you sure you want to deactivate{" "}
              <span className="font-semibold">{deleteDialog.reason.reasonCode}</span>?
            </p>
            <p className="text-xs text-gray-500 mb-5">
              This will set its status to Inactive.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="px-4 py-1.5 text-sm rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                onClick={() => setDeleteDialog({ open: false, reason: null })}
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-1.5 text-sm rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                onClick={handleDeactivate}
                disabled={deleteLoading}
              >
                {deleteLoading ? "Deactivating..." : "Deactivate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReasonMasterPage;
