"use client";

import { DashboardSidebar } from "@/components";
import React, { useEffect, useState } from "react";
import { showToast, showError } from "@/lib/toast";
import { API_BASE as ROOT_API_BASE } from "@/lib/env";

const API_BASE = `${ROOT_API_BASE}/api/delivery-charges`;

interface DeliveryChargeRule {
  id: number;
  ruleName: string;
  minOrderAmount: number;
  maxOrderAmount: number | null;
  deliveryCharge: number;
  isFreeDelivery: boolean;
  priority: number;
  status: string;
  description?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

const emptyForm = {
  ruleName: "",
  minOrderAmount: "",
  maxOrderAmount: "",
  deliveryCharge: "",
  priority: "",
  description: "",
  status: "A",
};

export default function DeliveryChargesPage() {
  const [rules, setRules] = useState<DeliveryChargeRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("A");

  // Add / Edit dialog
  const [dialog, setDialog] = useState<{ open: boolean; mode: "add" | "edit"; rule?: DeliveryChargeRule }>({ open: false, mode: "add" });
  const [form, setForm] = useState({ ...emptyForm });
  const [submitting, setSubmitting] = useState(false);

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: number; name: string } | null>(null);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const url = statusFilter ? `${API_BASE}?status=${statusFilter}` : API_BASE;
      const res = await fetch(url);
      const data = await res.json();
      setRules(Array.isArray(data.deliveryCharges) ? data.deliveryCharges : []);
    } catch {
      showError("Failed to load delivery charge rules");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRules(); }, [statusFilter]);

  const openAdd = () => {
    setForm({ ...emptyForm });
    setDialog({ open: true, mode: "add" });
  };

  const openEdit = (rule: DeliveryChargeRule) => {
    setForm({
      ruleName: rule.ruleName,
      minOrderAmount: String(rule.minOrderAmount ?? ""),
      maxOrderAmount: rule.maxOrderAmount != null ? String(rule.maxOrderAmount) : "",
      deliveryCharge: String(rule.deliveryCharge),
      priority: String(rule.priority),
      description: rule.description ?? "",
      status: rule.status,
    });
    setDialog({ open: true, mode: "edit", rule });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.ruleName.trim()) { showError("Rule name is required"); return; }
    if (form.deliveryCharge === "" || isNaN(Number(form.deliveryCharge)) || Number(form.deliveryCharge) < 0) {
      showError("Delivery charge must be a number â‰¥ 0"); return;
    }
    setSubmitting(true);
    try {
      const payload: any = {
        ruleName: form.ruleName.trim(),
        deliveryCharge: parseFloat(form.deliveryCharge),
        minOrderAmount: form.minOrderAmount !== "" ? parseFloat(form.minOrderAmount) : 0,
        maxOrderAmount: form.maxOrderAmount !== "" ? parseFloat(form.maxOrderAmount) : null,
        priority: form.priority !== "" ? parseInt(form.priority) : 100,
        description: form.description.trim() || null,
        status: form.status,
      };

      let res: Response;
      if (dialog.mode === "add") {
        payload.createdBy = "admin";
        res = await fetch(API_BASE, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      } else {
        payload.updatedBy = "admin";
        res = await fetch(`${API_BASE}/${dialog.rule!.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      }

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        showError(err?.responseMessage || "Failed to save rule");
        return;
      }
      showToast(dialog.mode === "add" ? "Rule created" : "Rule updated");
      setDialog({ open: false, mode: "add" });
      fetchRules();
    } catch {
      showError("Error saving rule");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      const res = await fetch(`${API_BASE}/${deleteConfirm.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) { showError(data?.responseMessage || "Failed to deactivate rule"); return; }
      showToast("Rule deactivated");
      setDeleteConfirm(null);
      fetchRules();
    } catch {
      showError("Error deactivating rule");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardSidebar />
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Delivery Charge Rules</h1>
          <button onClick={openAdd} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded transition-colors">
            + Add Rule
          </button>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-3 mb-5">
          <span className="text-sm font-medium text-gray-600">Show:</span>
          {[{ v: "A", l: "Active" }, { v: "I", l: "Inactive" }, { v: "", l: "All" }].map(({ v, l }) => (
            <button key={v} onClick={() => setStatusFilter(v)}
              className={`px-3 py-1 rounded text-sm font-medium border transition-colors ${statusFilter === v ? "bg-blue-500 text-white border-blue-500" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}>
              {l}
            </button>
          ))}
        </div>

        {/* Rules Table */}
        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading...</div>
        ) : rules.length === 0 ? (
          <div className="text-center py-16 text-gray-400">No delivery charge rules found.</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Priority</th>
                  <th className="px-4 py-3 text-left font-semibold">Rule Name</th>
                  <th className="px-4 py-3 text-right font-semibold">Min (â‚¹)</th>
                  <th className="px-4 py-3 text-right font-semibold">Max (â‚¹)</th>
                  <th className="px-4 py-3 text-right font-semibold">Charge (â‚¹)</th>
                  <th className="px-4 py-3 text-center font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold">Description</th>
                  <th className="px-4 py-3 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-center font-medium text-gray-700">{rule.priority}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {rule.ruleName}
                      {rule.isFreeDelivery && <span className="ml-2 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-semibold">FREE</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">â‚¹{rule.minOrderAmount}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{rule.maxOrderAmount != null ? `â‚¹${rule.maxOrderAmount}` : "â€”"}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {rule.deliveryCharge === 0 ? <span className="text-green-600">Free</span> : `â‚¹${rule.deliveryCharge}`}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${rule.status === "A" ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"}`}>
                        {rule.status === "A" ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-[180px] truncate">{rule.description || "â€”"}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <button onClick={() => openEdit(rule)} className="text-blue-600 hover:underline text-xs font-semibold">Edit</button>
                        {rule.status === "A" && (
                          <button onClick={() => setDeleteConfirm({ open: true, id: rule.id, name: rule.ruleName })} className="text-red-500 hover:underline text-xs font-semibold">Deactivate</button>
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
      {dialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">{dialog.mode === "add" ? "Add Delivery Charge Rule" : "Edit Delivery Charge Rule"}</h2>
              <button type="button" onClick={() => setDialog({ open: false, mode: "add" })} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rule Name <span className="text-red-500">*</span></label>
                <input required className="border rounded px-3 py-2 w-full text-sm" value={form.ruleName} onChange={e => setForm(f => ({ ...f, ruleName: e.target.value }))} placeholder="e.g. Free Delivery Above â‚¹500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Order Amount (â‚¹)</label>
                  <input type="number" min="0" step="0.01" className="border rounded px-3 py-2 w-full text-sm" value={form.minOrderAmount} onChange={e => setForm(f => ({ ...f, minOrderAmount: e.target.value }))} placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Order Amount (â‚¹)</label>
                  <input type="number" min="0" step="0.01" className="border rounded px-3 py-2 w-full text-sm" value={form.maxOrderAmount} onChange={e => setForm(f => ({ ...f, maxOrderAmount: e.target.value }))} placeholder="Leave blank = no limit" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Charge (â‚¹) <span className="text-red-500">*</span></label>
                  <input required type="number" min="0" step="0.01" className="border rounded px-3 py-2 w-full text-sm" value={form.deliveryCharge} onChange={e => setForm(f => ({ ...f, deliveryCharge: e.target.value }))} placeholder="0 = free" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <input type="number" min="1" className="border rounded px-3 py-2 w-full text-sm" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} placeholder="100 (lower = checked first)" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input className="border rounded px-3 py-2 w-full text-sm" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional notes" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select className="border rounded px-3 py-2 w-full text-sm" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="A">Active</option>
                  <option value="I">Inactive</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setDialog({ open: false, mode: "add" })} className="px-4 py-2 text-sm border rounded text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60">
                  {submitting ? "Saving..." : dialog.mode === "add" ? "Create Rule" : "Update Rule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deactivate Confirm */}
      {deleteConfirm?.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="text-base font-semibold mb-2">Deactivate Rule</h3>
            <p className="text-sm text-gray-600 mb-5">Are you sure you want to deactivate <span className="font-semibold">"{deleteConfirm.name}"</span>? It will no longer apply at checkout.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm border rounded text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleDelete} className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700">Deactivate</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
