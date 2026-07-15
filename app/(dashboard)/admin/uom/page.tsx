"use client";

import { DashboardSidebar } from "@/components";
import React, { useEffect, useState } from "react";
import { showToast, showError } from "@/lib/toast";
import apiClient from "@/lib/api";

interface UOM {
  uomId: number;
  uomCode: string;
  uomName: string;
  uomType: string;
  baseUomFlag: string;
  decimalAllowed: string;
  status: string;
  description: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string | null;
  updatedBy: string | null;
}

interface UOMFormState {
  uomCode: string;
  uomName: string;
  uomType: string;
  baseUomFlag: string;
  decimalAllowed: string;
  description: string;
}

const emptyForm: UOMFormState = {
  uomCode: "",
  uomName: "",
  uomType: "",
  baseUomFlag: "N",
  decimalAllowed: "N",
  description: "",
};

const UOM_TYPES = ["WEIGHT", "COUNT", "VOLUME", "LENGTH", "AREA", "TIME", "OTHER"];

const AdminUOMPage = () => {
  const [uoms, setUoms] = useState<UOM[]>([]);
  const [loading, setLoading] = useState(false);

  const [formDialog, setFormDialog] = useState<{
    open: boolean;
    mode: "add" | "edit";
    uomId: number | null;
  }>({ open: false, mode: "add", uomId: null });

  const [form, setForm] = useState<UOMFormState>(emptyForm);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    uom: UOM | null;
  }>({ open: false, uom: null });
  const [deleteLoading, setDeleteLoading] = useState(false);

  // â”€â”€ fetch all active UOMs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const fetchUOMs = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/products/uom");
      if (!res.ok) throw new Error("Failed to fetch UOMs");
      const data = await res.json();
      setUoms(Array.isArray(data) ? data : []);
    } catch (err: any) {
      showError(err.message || "Failed to fetch UOMs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => fetchUOMs(), 0);
    return () => clearTimeout(t);
  }, []);

  // â”€â”€ open dialogs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const openAdd = () => {
    setForm(emptyForm);
    setFormError("");
    setFormDialog({ open: true, mode: "add", uomId: null });
  };

  const openEdit = (uom: UOM) => {
    setFormError("");
    setForm({
      uomCode: uom.uomCode,
      uomName: uom.uomName,
      uomType: uom.uomType,
      baseUomFlag: uom.baseUomFlag,
      decimalAllowed: uom.decimalAllowed,
      description: uom.description ?? "",
    });
    setFormDialog({ open: true, mode: "edit", uomId: uom.uomId });
  };

  const closeForm = () => setFormDialog({ open: false, mode: "add", uomId: null });

  // â”€â”€ form change â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // â”€â”€ submit create / update â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);
    try {
      let res: Response;
      if (formDialog.mode === "add") {
        const payload = {
          uomCode: form.uomCode.trim().toUpperCase(),
          uomName: form.uomName.trim(),
          uomType: form.uomType.trim().toUpperCase(),
          baseUomFlag: form.baseUomFlag,
          decimalAllowed: form.decimalAllowed,
          description: form.description.trim() || undefined,
          createdBy: "admin",
        };
        res = await apiClient.post("/products/uom", payload);
      } else {
        const payload: Record<string, any> = {
          uomName: form.uomName.trim(),
          uomType: form.uomType.trim().toUpperCase(),
          baseUomFlag: form.baseUomFlag,
          decimalAllowed: form.decimalAllowed,
          status: "ACTIVE",
          description: form.description.trim() || undefined,
          updatedBy: "admin",
        };
        res = await apiClient.put(`/products/uom/${formDialog.uomId}`, payload);
      }
      const data = await res.json();
      if (!res.ok || data.responseStatus === "FAILURE") {
        throw new Error(data.responseMessage || "Operation failed");
      }
      showToast(data.responseMessage || (formDialog.mode === "add" ? "UOM created" : "UOM updated"));
      closeForm();
      fetchUOMs();
    } catch (err: any) {
      setFormError(err.message || "Operation failed");
    } finally {
      setFormLoading(false);
    }
  };

  // â”€â”€ delete â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleDelete = async () => {
    if (!deleteDialog.uom) return;
    setDeleteLoading(true);
    try {
      const res = await apiClient.delete(`/products/uom/${deleteDialog.uom.uomId}`);
      const data = await res.json();
      if (!res.ok || data.responseStatus === "FAILURE") {
        throw new Error(data.responseMessage || "Delete failed");
      }
      showToast(data.responseMessage || "UOM deleted");
      setDeleteDialog({ open: false, uom: null });
      fetchUOMs();
    } catch (err: any) {
      showError(err.message || "Delete failed");
    } finally {
      setDeleteLoading(false);
    }
  };

  // â”€â”€ render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <div className="bg-white flex flex-col min-h-screen max-w-screen-2xl mx-auto">
      <DashboardSidebar />
      <div className="flex-1 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-800">UOM Master</h1>
            <button
              type="button"
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 font-medium"
              onClick={openAdd}
            >
              + Add UOM
            </button>
          </div>

          {/* Table */}
          {loading ? (
            <div className="text-center py-16 text-gray-500 text-sm">Loading...</div>
          ) : uoms.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm">No UOMs found.</div>
          ) : (
            <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 text-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">ID</th>
                    <th className="px-4 py-3 text-left font-semibold">Code</th>
                    <th className="px-4 py-3 text-left font-semibold">Name</th>
                    <th className="px-4 py-3 text-left font-semibold">Type</th>
                    <th className="px-4 py-3 text-center font-semibold">Base UOM</th>
                    <th className="px-4 py-3 text-center font-semibold">Decimal</th>
                    <th className="px-4 py-3 text-left font-semibold">Description</th>
                    <th className="px-4 py-3 text-center font-semibold">Status</th>
                    <th className="px-4 py-3 text-center font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {uoms.map((uom, idx) => (
                    <tr
                      key={uom.uomId}
                      className={`border-t ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50 transition-colors`}
                    >
                      <td className="px-4 py-3 text-gray-500">{uom.uomId}</td>
                      <td className="px-4 py-3 font-mono font-semibold text-gray-800">{uom.uomCode}</td>
                      <td className="px-4 py-3 text-gray-800">{uom.uomName}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-medium">
                          {uom.uomType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {uom.baseUomFlag === "Y" ? (
                          <span className="text-green-600 font-semibold text-xs">Yes</span>
                        ) : (
                          <span className="text-gray-400 text-xs">No</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {uom.decimalAllowed === "Y" ? (
                          <span className="text-green-600 font-semibold text-xs">Yes</span>
                        ) : (
                          <span className="text-gray-400 text-xs">No</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">{uom.description || "â€”"}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          uom.status === "ACTIVE"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-600"
                        }`}>
                          {uom.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            className="text-xs px-3 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 font-medium"
                            onClick={() => openEdit(uom)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="text-xs px-3 py-1 rounded bg-red-100 text-red-600 hover:bg-red-200 font-medium"
                            onClick={() => setDeleteDialog({ open: true, uom })}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* â”€â”€ Add / Edit Dialog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {formDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                {formDialog.mode === "add" ? "Add Unit of Measure" : "Edit Unit of Measure"}
              </h3>
              <button type="button" className="text-gray-400 hover:text-gray-700 text-xl leading-none" onClick={closeForm}>✕</button>
            </div>

            {formError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2 mb-4">{formError}</p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Code + Name */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    UOM Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="uomCode"
                    value={form.uomCode}
                    onChange={handleChange}
                    required
                    disabled={formDialog.mode === "edit"}
                    maxLength={20}
                    placeholder="e.g. KG"
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 uppercase ${
                      formDialog.mode === "edit" ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""
                    }`}
                  />
                  {formDialog.mode === "edit" && (
                    <p className="text-xs text-gray-400 mt-0.5">Code cannot be changed via edit</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    UOM Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="uomName"
                    value={form.uomName}
                    onChange={handleChange}
                    required
                    maxLength={100}
                    placeholder="e.g. Kilogram"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  UOM Type <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <select
                    name="uomType"
                    value={UOM_TYPES.includes(form.uomType) ? form.uomType : "__custom__"}
                    onChange={e => {
                      if (e.target.value !== "__custom__") {
                        setForm(prev => ({ ...prev, uomType: e.target.value }));
                      } else {
                        setForm(prev => ({ ...prev, uomType: "" }));
                      }
                    }}
                    required={UOM_TYPES.includes(form.uomType) || form.uomType === ""}
                    className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                  >
                    <option value="">â€” Select Type â€”</option>
                    {UOM_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                    <option value="__custom__">Custom…</option>
                  </select>
                  {!UOM_TYPES.includes(form.uomType) && form.uomType !== "" && (
                    <input
                      type="text"
                      name="uomType"
                      value={form.uomType}
                      onChange={handleChange}
                      required
                      maxLength={50}
                      placeholder="Custom type"
                      className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                  )}
                </div>
              </div>

              {/* Flags */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Base UOM</label>
                  <select
                    name="baseUomFlag"
                    value={form.baseUomFlag}
                    onChange={handleChange}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                  >
                    <option value="N">No</option>
                    <option value="Y">Yes</option>
                  </select>
                  <p className="text-xs text-gray-400 mt-0.5">Is this the base unit for its type?</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Decimal Allowed</label>
                  <select
                    name="decimalAllowed"
                    value={form.decimalAllowed}
                    onChange={handleChange}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                  >
                    <option value="N">No (whole numbers only)</option>
                    <option value="Y">Yes (fractional quantities)</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  maxLength={255}
                  rows={2}
                  placeholder="Optional description…"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={formLoading}
                  className="px-4 py-1.5 text-sm rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {formLoading
                    ? formDialog.mode === "add" ? "Creating…" : "Saving…"
                    : formDialog.mode === "add" ? "Create" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* â”€â”€ Delete Confirmation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {deleteDialog.open && deleteDialog.uom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Delete UOM</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete{" "}
              <span className="font-semibold">{deleteDialog.uom.uomName}</span>{" "}
              (<span className="font-mono">{deleteDialog.uom.uomCode}</span>)?
              This will mark it as inactive.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="px-4 py-1.5 text-sm rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                onClick={() => setDeleteDialog({ open: false, uom: null })}
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-1.5 text-sm rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                onClick={handleDelete}
                disabled={deleteLoading}
              >
                {deleteLoading ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUOMPage;
