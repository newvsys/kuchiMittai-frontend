"use client";
import React, { useEffect, useState } from "react";
import { showToast, showError } from "@/lib/toast";
import { DashboardSidebar } from "@/components";
import { API_BASE } from "@/lib/env";

const API = `${API_BASE}/products/labels/config`;

interface LabelConfig {
  id: number;
  configName: string;
  description: string | null;
  labelWidthInches: number;
  labelHeightInches: number;
  showLogo: boolean;
  logoPath: string | null;
  showBrandName: boolean;
  showProductName: boolean;
  showVariantDetails: boolean;
  showNetQuantity: boolean;
  showMfgDate: boolean;
  showExpDate: boolean;
  showBatchNo: boolean;
  showMrp: boolean;
  showBarcode: boolean;
  fssaiCode: string | null;
  showFssaiCode: boolean;
  columnsPerRow: number;
  isDefault: boolean;
  status: string;
  createdAt: string | null;
  createdBy: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
}

const emptyForm = (): Omit<LabelConfig, "id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy"> => ({
  configName: "",
  description: "",
  labelWidthInches: 2.0,
  labelHeightInches: 2.0,
  showLogo: false,
  logoPath: "",
  showBrandName: true,
  showProductName: true,
  showVariantDetails: true,
  showNetQuantity: true,
  showMfgDate: true,
  showExpDate: true,
  showBatchNo: true,
  showMrp: true,
  showBarcode: true,
  fssaiCode: "",
  showFssaiCode: true,
  columnsPerRow: 1,
  isDefault: false,
  status: "ACTIVE",
});

type FormState = ReturnType<typeof emptyForm>;

const LabelConfigPage = () => {
  const [configs, setConfigs] = useState<LabelConfig[]>([]);
  const [loading, setLoading] = useState(false);

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: number; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Set-default
  const [settingDefault, setSettingDefault] = useState<number | null>(null);

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const res = await fetch(API);
      const data = await res.json();
      setConfigs(Array.isArray(data) ? data : []);
    } catch {
      showError("Failed to load configurations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => fetchConfigs(), 0);
    return () => clearTimeout(t);
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (c: LabelConfig) => {
    setEditingId(c.id);
    setForm({
      configName: c.configName,
      description: c.description || "",
      labelWidthInches: c.labelWidthInches,
      labelHeightInches: c.labelHeightInches,
      showLogo: c.showLogo,
      logoPath: c.logoPath || "",
      showBrandName: c.showBrandName,
      showProductName: c.showProductName,
      showVariantDetails: c.showVariantDetails,
      showNetQuantity: c.showNetQuantity,
      showMfgDate: c.showMfgDate,
      showExpDate: c.showExpDate,
      showBatchNo: c.showBatchNo,
      showMrp: c.showMrp,
      showBarcode: c.showBarcode,
      fssaiCode: c.fssaiCode || "",
      showFssaiCode: c.showFssaiCode ?? true,
      columnsPerRow: c.columnsPerRow ?? 1,
      isDefault: c.isDefault,
      status: c.status || "ACTIVE",
    });
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.configName.trim()) { showError("Config Name is required"); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        logoPath: form.logoPath?.trim() || null,
        description: form.description?.trim() || null,
        fssaiCode: form.fssaiCode?.trim() || null,
      };
      const res = await fetch(
        editingId ? `${API}/${editingId}` : API,
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        showError(data?.error || data?.message || "Save failed");
        return;
      }
      showToast(editingId ? "Configuration updated" : "Configuration created");
      setDialogOpen(false);
      fetchConfigs();
    } catch {
      showError("Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API}/${deleteConfirm.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || data.responseStatus === "FAILURE") throw new Error(data.responseMessage || "Delete failed");
      showToast("Configuration deleted");
      setDeleteConfirm(null);
      fetchConfigs();
    } catch (err: any) {
      showError(err.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const handleSetDefault = async (id: number) => {
    setSettingDefault(id);
    try {
      const res = await fetch(`${API}/${id}/set-default`, { method: "PUT" });
      const data = await res.json();
      if (!res.ok || data.responseStatus === "FAILURE") throw new Error(data.responseMessage || "Failed");
      showToast("Default configuration updated");
      fetchConfigs();
    } catch (err: any) {
      showError(err.message || "Failed to set default");
    } finally {
      setSettingDefault(null);
    }
  };

  const setBool = (key: keyof FormState, val: boolean) =>
    setForm(f => ({ ...f, [key]: val }));

  const TOGGLE_FIELDS: { key: keyof FormState; label: string }[] = [
    { key: "showBrandName",     label: "Brand Name" },
    { key: "showProductName",   label: "Product Name" },
    { key: "showVariantDetails",label: "Variant Details" },
    { key: "showNetQuantity",   label: "Net Quantity" },
    { key: "showMfgDate",       label: "Mfg Date" },
    { key: "showExpDate",       label: "Exp Date" },
    { key: "showBatchNo",       label: "Batch No" },
    { key: "showMrp",           label: "MRP" },
    { key: "showBarcode",       label: "Barcode" },
    { key: "showFssaiCode",     label: "FSSAI Code" },
    { key: "showLogo",          label: "Logo" },
  ];

  return (
    <div className="bg-white flex flex-col min-h-screen max-w-screen-2xl mx-auto">
      <DashboardSidebar />
      <div className="flex-1 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Label Configurations</h1>
            <button
              type="button"
              onClick={openCreate}
              className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 font-medium"
            >
              + New Configuration
            </button>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
            {loading ? (
              <p className="text-sm text-gray-400 p-6">Loadingâ€¦</p>
            ) : configs.length === 0 ? (
              <p className="text-sm text-gray-400 p-6">No configurations found. Create one to get started.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Name</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Size (WÃ—H)</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Cols/Row</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Fields</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Default</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {configs.map(c => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-800">{c.configName}</p>
                          {c.description && <p className="text-xs text-gray-400 mt-0.5">{c.description}</p>}
                        </td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          {c.labelWidthInches}" Ã— {c.labelHeightInches}"
                        </td>
                        <td className="px-4 py-3 text-center text-gray-700 text-sm font-medium">
                          {c.columnsPerRow ?? 1}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {TOGGLE_FIELDS.filter(f => c[f.key as keyof LabelConfig] === true).map(f => (
                              <span key={f.key} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-xs rounded">{f.label}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            c.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                          }`}>{c.status}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {c.isDefault ? (
                            <span className="text-yellow-500 font-bold text-base" title="Default">â˜…</span>
                          ) : (
                            <button
                              type="button"
                              disabled={settingDefault === c.id}
                              onClick={() => handleSetDefault(c.id)}
                              className="text-xs text-gray-400 hover:text-yellow-500 disabled:opacity-50"
                              title="Set as default"
                            >
                              {settingDefault === c.id ? "â€¦" : "â˜† Set"}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-3">
                            <button
                              type="button"
                              onClick={() => openEdit(c)}
                              className="text-xs text-indigo-600 font-semibold hover:underline"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirm({ open: true, id: c.id, name: c.configName })}
                              className="text-xs text-red-500 font-semibold hover:underline"
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
      </div>

      {/* â”€â”€ Create / Edit Dialog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-base font-semibold text-gray-800">
                {editingId ? "Edit Label Configuration" : "New Label Configuration"}
              </h2>
              <button type="button" className="text-gray-400 hover:text-gray-600 text-sm" onClick={() => setDialogOpen(false)}>Close</button>
            </div>
            <form onSubmit={handleSave} className="px-6 py-5 space-y-5">

              {/* Name & Description */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Config Name <span className="text-red-500">*</span></label>
                  <input
                    required
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    placeholder='e.g. "2x2 Standard"'
                    value={form.configName}
                    onChange={e => setForm(f => ({ ...f, configName: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                  <select
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <textarea
                  rows={2}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                  placeholder="Optional description"
                  value={form.description || ""}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>

              {/* Dimensions */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Label Dimensions &amp; Layout</p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Width (inches) <span className="text-red-500">*</span></label>
                    <input
                      type="number" step="0.1" min="0.5" max="12" required
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      value={form.labelWidthInches}
                      onChange={e => setForm(f => ({ ...f, labelWidthInches: parseFloat(e.target.value) || 2 }))}
                    />
                    <p className="text-xs text-gray-400 mt-1">{(form.labelWidthInches * 72).toFixed(0)} pt</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Height (inches) <span className="text-red-500">*</span></label>
                    <input
                      type="number" step="0.1" min="0.5" max="12" required
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      value={form.labelHeightInches}
                      onChange={e => setForm(f => ({ ...f, labelHeightInches: parseFloat(e.target.value) || 2 }))}
                    />
                    <p className="text-xs text-gray-400 mt-1">{(form.labelHeightInches * 72).toFixed(0)} pt</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Columns per Row</label>
                    <input
                      type="number" min="1" max="4" step="1"
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      value={form.columnsPerRow}
                      onChange={e => setForm(f => ({ ...f, columnsPerRow: Math.max(1, parseInt(e.target.value) || 1) }))}
                    />
                    <p className="text-xs text-gray-400 mt-1">{form.columnsPerRow === 1 ? "Single column" : `${form.columnsPerRow} fields per row`}</p>
                  </div>
                </div>
              </div>

              {/* Label Fields */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Fields to Print on Label</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {TOGGLE_FIELDS.map(f => (
                    <label key={f.key} className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-indigo-600"
                        checked={!!form[f.key as keyof FormState]}
                        onChange={e => setBool(f.key as keyof FormState, e.target.checked)}
                      />
                      <span className="text-sm text-gray-700">{f.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* FSSAI Code (only when showFssaiCode) */}
              {form.showFssaiCode && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">FSSAI Licence Number</label>
                  <input
                    className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    placeholder="e.g. 10014011000015"
                    maxLength={14}
                    value={form.fssaiCode || ""}
                    onChange={e => setForm(f => ({ ...f, fssaiCode: e.target.value }))}
                  />
                  <p className="text-xs text-gray-400 mt-1">14-digit FSSAI licence number. Printed after MRP, before the barcode. Hidden if left blank.</p>
                </div>
              )}

              {/* Logo path (only when showLogo) */}
              {form.showLogo && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Logo Path (absolute filesystem path)</label>
                  <input
                    className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    placeholder="e.g. /public/companyLogo/logo.png"
                    value={form.logoPath || ""}
                    onChange={e => setForm(f => ({ ...f, logoPath: e.target.value }))}
                  />
                </div>
              )}

              {/* Set as default */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-yellow-500"
                    checked={form.isDefault}
                    onChange={e => setForm(f => ({ ...f, isDefault: e.target.checked }))}
                  />
                  <span className="text-sm text-gray-700 font-medium">Set as system default configuration</span>
                </label>
                <p className="text-xs text-gray-400 mt-1 ml-6">Any currently active default will be automatically demoted.</p>
              </div>

              {/* Footer buttons */}
              <div className="flex justify-end gap-3 pt-2 border-t">
                <button type="button" onClick={() => setDialogOpen(false)} className="px-4 py-2 text-sm border rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60 font-medium">
                  {saving ? "Savingâ€¦" : editingId ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* â”€â”€ Delete Confirm Dialog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {deleteConfirm?.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-gray-800 mb-2">Delete Configuration</h3>
            <p className="text-sm text-gray-600 mb-5">
              Delete <span className="font-semibold">"{deleteConfirm.name}"</span>? This marks it as INACTIVE and it cannot be used for new print jobs.
            </p>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm border rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
              <button type="button" onClick={handleDelete} disabled={deleting} className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-60 font-medium">
                {deleting ? "Deletingâ€¦" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LabelConfigPage;
