"use client";

import { DashboardSidebar } from "@/components";
import React, { useEffect, useState } from "react";
import { showToast, showError } from "@/lib/toast";
import apiClient from "@/lib/api";

interface Carton {
  id: number;
  name: string;
  length: number;
  breadth: number;
  height: number;
  maxWeight: number;
  emptyWeight: number;
  status: string;
  who: string;
}

interface CartonFormState {
  name: string;
  length: string;
  breadth: string;
  height: string;
  maxWeight: string;
  emptyWeight: string;
  who: string;
}

const emptyForm: CartonFormState = {
  name: "",
  length: "",
  breadth: "",
  height: "",
  maxWeight: "",
  emptyWeight: "",
  who: "admin",
};

const AdminCartonsPage = () => {
  const [cartons, setCartons] = useState<Carton[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"" | "A" | "I">("");

  const [formDialog, setFormDialog] = useState<{
    open: boolean;
    mode: "add" | "edit";
    cartonId: number | null;
  }>({ open: false, mode: "add", cartonId: null });

  const [form, setForm] = useState<CartonFormState>(emptyForm);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    carton: Carton | null;
  }>({ open: false, carton: null });
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchCartons = async () => {
    setLoading(true);
    try {
      const endpoint =
        statusFilter
          ? `/api/cartons?status=${statusFilter}`
          : "/api/cartons";
      const res = await apiClient.get(endpoint);
      if (!res.ok) throw new Error("Failed to fetch cartons");
      const data = await res.json();
      setCartons(data.cartons || []);
    } catch (err: any) {
      showError(err.message || "Failed to fetch cartons");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCartons();
  }, [statusFilter]);

  const openAdd = () => {
    setForm(emptyForm);
    setFormError("");
    setFormDialog({ open: true, mode: "add", cartonId: null });
  };

  const openEdit = async (carton: Carton) => {
    setFormError("");
    setFormDialog({ open: true, mode: "edit", cartonId: carton.id });
    setForm({
      name: carton.name,
      length: String(carton.length),
      breadth: String(carton.breadth),
      height: String(carton.height),
      maxWeight: String(carton.maxWeight),
      emptyWeight: String(carton.emptyWeight),
      who: carton.who,
    });
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);
    try {
      const payload: any = {
        length: parseFloat(form.length),
        breadth: parseFloat(form.breadth),
        height: parseFloat(form.height),
        maxWeight: parseFloat(form.maxWeight),
        emptyWeight: parseFloat(form.emptyWeight),
        who: form.who.trim() || "admin",
      };
      if (form.name.trim()) payload.name = form.name.trim();

      let res: Response;
      if (formDialog.mode === "add") {
        res = await apiClient.post("/api/carton", payload);
      } else {
        res = await apiClient.put(`/api/carton/${formDialog.cartonId}`, payload);
      }

      const data = await res.json();
      if (!res.ok || data.responseStatus === "FAILURE") {
        throw new Error(data.responseMessage || "Operation failed");
      }

      showToast(data.responseMessage || (formDialog.mode === "add" ? "Carton created" : "Carton updated"));
      setFormDialog({ open: false, mode: "add", cartonId: null });
      fetchCartons();
    } catch (err: any) {
      setFormError(err.message || "Operation failed");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.carton) return;
    setDeleteLoading(true);
    try {
      const res = await apiClient.request(`/api/carton/${deleteDialog.carton.id}`, {
        method: "DELETE",
        body: JSON.stringify({ status: "I", who: "admin" }),
      });
      const data = await res.json();
      if (!res.ok || data.responseStatus === "FAILURE") {
        throw new Error(data.responseMessage || "Delete failed");
      }
      showToast(data.responseMessage || "Carton deactivated");
      setDeleteDialog({ open: false, carton: null });
      fetchCartons();
    } catch (err: any) {
      showError(err.message || "Delete failed");
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
          <h1 className="text-2xl font-bold text-gray-800">Cartons</h1>
          <button
            type="button"
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            onClick={openAdd}
          >
            + Add Carton
          </button>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-sm font-medium text-gray-600">Status:</span>
          {(["", "A", "I"] as const).map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 text-xs rounded border font-medium transition-colors ${
                statusFilter === s
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
              }`}
            >
              {s === "" ? "All" : s === "A" ? "Active" : "Inactive"}
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-16 text-gray-500 text-sm">Loading...</div>
        ) : cartons.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">No cartons found.</div>
        ) : (
          <div className="overflow-x-auto rounded border bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">ID</th>
                  <th className="px-4 py-3 text-left font-semibold">Name</th>
                  <th className="px-4 py-3 text-right font-semibold">L (cm)</th>
                  <th className="px-4 py-3 text-right font-semibold">B (cm)</th>
                  <th className="px-4 py-3 text-right font-semibold">H (cm)</th>
                  <th className="px-4 py-3 text-right font-semibold">Max Wt (g)</th>
                  <th className="px-4 py-3 text-right font-semibold">Empty Wt (g)</th>
                  <th className="px-4 py-3 text-center font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold">Who</th>
                  <th className="px-4 py-3 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {cartons.map((c, idx) => (
                  <tr
                    key={c.id}
                    className={`border-t ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50 transition-colors`}
                  >
                    <td className="px-4 py-3 text-gray-500">{c.id}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{c.length}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{c.breadth}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{c.height}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{c.maxWeight}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{c.emptyWeight}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          c.status === "A"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-600"
                        }`}
                      >
                        {c.status === "A" ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{c.who}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          className="text-xs px-3 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 font-medium"
                          onClick={() => openEdit(c)}
                        >
                          Edit
                        </button>
                        {c.status === "A" && (
                          <button
                            type="button"
                            className="text-xs px-3 py-1 rounded bg-red-100 text-red-600 hover:bg-red-200 font-medium"
                            onClick={() => setDeleteDialog({ open: true, carton: c })}
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
                {formDialog.mode === "add" ? "Add Carton" : "Edit Carton"}
              </h3>
              <button
                type="button"
                className="text-sm text-gray-500 hover:text-gray-700"
                onClick={() => setFormDialog({ open: false, mode: "add", cartonId: null })}
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
                  Name <span className="text-xs text-gray-400 font-normal">(optional â€” auto-derived if blank)</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleFormChange}
                  placeholder="e.g. 30x20x15"
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                {(["length", "breadth", "height"] as const).map(field => (
                  <div key={field}>
                    <label className="block text-sm font-medium mb-1 text-gray-700 capitalize">
                      {field} (cm) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name={field}
                      value={form[field]}
                      onChange={handleFormChange}
                      min="0"
                      step="0.1"
                      required
                      className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">
                    Max Weight (g) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="maxWeight"
                    value={form.maxWeight}
                    onChange={handleFormChange}
                    min="0"
                    step="1"
                    required
                    className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">
                    Empty Weight (g) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="emptyWeight"
                    value={form.emptyWeight}
                    onChange={handleFormChange}
                    min="0"
                    step="1"
                    required
                    className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Who <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="who"
                  value={form.who}
                  onChange={handleFormChange}
                  required
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="px-4 py-1.5 text-sm rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                  onClick={() => setFormDialog({ open: false, mode: "add", cartonId: null })}
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

      {/* Delete Confirmation Dialog */}
      {deleteDialog.open && deleteDialog.carton && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold mb-2">Deactivate Carton</h3>
            <p className="text-sm text-gray-700 mb-1">
              Are you sure you want to deactivate carton{" "}
              <span className="font-semibold">{deleteDialog.carton.name}</span>?
            </p>
            <p className="text-xs text-gray-500 mb-5">
              This will set its status to Inactive. It will no longer appear in active listings.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="px-4 py-1.5 text-sm rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                onClick={() => setDeleteDialog({ open: false, carton: null })}
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
                {deleteLoading ? "Deactivating..." : "Deactivate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCartonsPage;
