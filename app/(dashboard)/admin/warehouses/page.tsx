"use client";

import { DashboardSidebar } from "@/components";
import React, { useEffect, useState } from "react";
import { showToast, showError } from "@/lib/toast";
import apiClient from "@/lib/api";

interface Warehouse {
  warehouseId: number;
  warehouseName: string;
  warehouseCode: string;
  channelId: string;
  contactPerson: string;
  contactNumber: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  latitude: number;
  longitude: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface WarehouseFormState {
  warehouseName: string;
  warehouseCode: string;
  channelId: string;
  contactPerson: string;
  contactNumber: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  latitude: string;
  longitude: string;
}

const emptyForm: WarehouseFormState = {
  warehouseName: "",
  warehouseCode: "",
  channelId: "",
  contactPerson: "",
  contactNumber: "",
  email: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
  latitude: "",
  longitude: "",
};

const AdminWarehousesPage = () => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(false);

  const [formDialog, setFormDialog] = useState<{
    open: boolean;
    mode: "add" | "edit";
    warehouseId: number | null;
  }>({ open: false, mode: "add", warehouseId: null });

  const [form, setForm] = useState<WarehouseFormState>(emptyForm);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [postalLookupLoading, setPostalLookupLoading] = useState(false);

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    warehouse: Warehouse | null;
  }>({ open: false, warehouse: null });
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchWarehouses = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/api/Get-All-Warehouses");
      if (!res.ok) throw new Error("Failed to fetch warehouses");
      const data = await res.json();
      if (data.responseStatus === "FAILURE") {
        throw new Error(data.responseMessage || "Failed to fetch warehouses");
      }
      setWarehouses(Array.isArray(data) ? data : []);
    } catch (err: any) {
      showError(err.message || "Failed to fetch warehouses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => fetchWarehouses(), 0);
    return () => clearTimeout(t);
  }, []);

  const openAdd = () => {
    setForm(emptyForm);
    setFormError("");
    setFormDialog({ open: true, mode: "add", warehouseId: null });
  };

  const openEdit = (warehouse: Warehouse) => {
    setFormError("");
    setFormDialog({ open: true, mode: "edit", warehouseId: warehouse.warehouseId });
    setForm({
      warehouseName: warehouse.warehouseName,
      warehouseCode: warehouse.warehouseCode,
      channelId: warehouse.channelId ?? "",
      contactPerson: warehouse.contactPerson,
      contactNumber: warehouse.contactNumber,
      email: warehouse.email,
      addressLine1: warehouse.addressLine1,
      addressLine2: warehouse.addressLine2 ?? "",
      city: warehouse.city,
      state: warehouse.state,
      postalCode: warehouse.postalCode,
      country: warehouse.country,
      latitude: String(warehouse.latitude),
      longitude: String(warehouse.longitude),
    });
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePostalCodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setForm(prev => ({ ...prev, postalCode: value }));
    if (value.length !== 6) return;
    setPostalLookupLoading(true);
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${value}`);
      const data = await res.json();
      if (data?.[0]?.Status === "Success" && data[0].PostOffice?.length > 0) {
        const po = data[0].PostOffice[0];
        setForm(prev => ({
          ...prev,
          city: po.District || po.Block || prev.city,
          state: po.State || prev.state,
          country: po.Country || prev.country,
        }));
      }
    } catch {
      // silently ignore lookup failures
    } finally {
      setPostalLookupLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);
    try {
      let res: Response;
      if (formDialog.mode === "add") {
        const payload = {
          warehouseName: form.warehouseName.trim(),
          warehouseCode: form.warehouseCode.trim(),
          channelId: form.channelId.trim() || undefined,
          contactPerson: form.contactPerson.trim(),
          contactNumber: form.contactNumber.trim(),
          email: form.email.trim(),
          addressLine1: form.addressLine1.trim(),
          addressLine2: form.addressLine2.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          postalCode: form.postalCode.trim(),
          country: form.country.trim(),
          latitude: form.latitude ? parseFloat(form.latitude) : undefined,
          longitude: form.longitude ? parseFloat(form.longitude) : undefined,
        };
        res = await apiClient.post("/api/Create-Warehouse", payload);
      } else {
        const payload: Record<string, any> = {
          warehouseName: form.warehouseName.trim(),
          channelId: form.channelId.trim() || undefined,
          contactPerson: form.contactPerson.trim(),
          contactNumber: form.contactNumber.trim(),
          email: form.email.trim(),
          addressLine1: form.addressLine1.trim(),
          addressLine2: form.addressLine2.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          postalCode: form.postalCode.trim(),
          country: form.country.trim(),
          status: "A",
        };
        if (form.latitude) payload.latitude = parseFloat(form.latitude);
        if (form.longitude) payload.longitude = parseFloat(form.longitude);
        res = await apiClient.put(`/api/Update-Warehouse/${formDialog.warehouseId}`, payload);
      }

      const data = await res.json();
      if (!res.ok || data.responseStatus === "FAILURE") {
        throw new Error(data.responseMessage || "Operation failed");
      }

      showToast(data.responseMessage || (formDialog.mode === "add" ? "Warehouse created" : "Warehouse updated"));
      setFormDialog({ open: false, mode: "add", warehouseId: null });
      fetchWarehouses();
    } catch (err: any) {
      setFormError(err.message || "Operation failed");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.warehouse) return;
    setDeleteLoading(true);
    try {
      const res = await apiClient.delete(`/api/Delete-Warehouse/${deleteDialog.warehouse.warehouseId}`);
      const data = await res.json();
      if (!res.ok || data.responseStatus === "FAILURE") {
        throw new Error(data.responseMessage || "Delete failed");
      }
      showToast(data.responseMessage || "Warehouse deleted");
      setDeleteDialog({ open: false, warehouse: null });
      fetchWarehouses();
    } catch (err: any) {
      showError(err.message || "Delete failed");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardSidebar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Warehouses</h1>
          <button
            type="button"
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            onClick={openAdd}
          >
            + Add Warehouse
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-16 text-gray-500 text-sm">Loading...</div>
        ) : warehouses.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">No warehouses found.</div>
        ) : (
          <div className="overflow-x-auto rounded border bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">ID</th>
                  <th className="px-4 py-3 text-left font-semibold">Name</th>
                  <th className="px-4 py-3 text-left font-semibold">Code</th>
                  <th className="px-4 py-3 text-left font-semibold">Channel ID</th>
                  <th className="px-4 py-3 text-left font-semibold">Contact Person</th>
                  <th className="px-4 py-3 text-left font-semibold">Contact Number</th>
                  <th className="px-4 py-3 text-left font-semibold">City</th>
                  <th className="px-4 py-3 text-left font-semibold">State</th>
                  <th className="px-4 py-3 text-left font-semibold">Country</th>
                  <th className="px-4 py-3 text-center font-semibold">Status</th>
                  <th className="px-4 py-3 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {warehouses.map((w, idx) => (
                  <tr
                    key={w.warehouseId}
                    className={`border-t ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50 transition-colors`}
                  >
                    <td className="px-4 py-3 text-gray-500">{w.warehouseId}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{w.warehouseName}</td>
                    <td className="px-4 py-3 text-gray-700 font-mono text-xs">{w.warehouseCode}</td>
                    <td className="px-4 py-3 text-gray-700 font-mono text-xs">{w.channelId || "â€”"}</td>
                    <td className="px-4 py-3 text-gray-700">{w.contactPerson}</td>
                    <td className="px-4 py-3 text-gray-700">{w.contactNumber}</td>
                    <td className="px-4 py-3 text-gray-700">{w.city}</td>
                    <td className="px-4 py-3 text-gray-700">{w.state}</td>
                    <td className="px-4 py-3 text-gray-700">{w.country}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          w.status === "A"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-600"
                        }`}
                      >
                        {w.status === "A" ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          className="text-xs px-3 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 font-medium"
                          onClick={() => openEdit(w)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="text-xs px-3 py-1 rounded bg-red-100 text-red-600 hover:bg-red-200 font-medium"
                          onClick={() => setDeleteDialog({ open: true, warehouse: w })}
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

      {/* Add / Edit Dialog */}
      {formDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {formDialog.mode === "add" ? "Add Warehouse" : "Edit Warehouse"}
              </h3>
              <button
                type="button"
                className="text-sm text-gray-500 hover:text-gray-700"
                onClick={() => setFormDialog({ open: false, mode: "add", warehouseId: null })}
              >
                Close
              </button>
            </div>

            {formError && (
              <p className="text-sm text-red-600 mb-3">{formError}</p>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">
                    Channel ID
                    <span className="text-xs text-gray-400 font-normal ml-1">(Shiprocket Sales Channel)</span>
                  </label>
                  <input
                    type="text"
                    name="channelId"
                    value={form.channelId}
                    onChange={handleFormChange}
                    placeholder="e.g. 10576563"
                    className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">
                    Warehouse Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="warehouseName"
                    value={form.warehouseName}
                    onChange={handleFormChange}
                    required
                    className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">
                    Warehouse Code <span className="text-red-500">*</span>
                    {formDialog.mode === "edit" && (
                      <span className="text-xs text-gray-400 font-normal ml-1">(cannot be changed)</span>
                    )}
                  </label>
                  <input
                    type="text"
                    name="warehouseCode"
                    value={form.warehouseCode}
                    onChange={handleFormChange}
                    required
                    disabled={formDialog.mode === "edit"}
                    className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 ${
                      formDialog.mode === "edit" ? "bg-gray-100 cursor-not-allowed text-gray-500" : ""
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">
                    Contact Person <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="contactPerson"
                    value={form.contactPerson}
                    onChange={handleFormChange}
                    required
                    className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">
                    Contact Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="contactNumber"
                    value={form.contactNumber}
                    onChange={handleFormChange}
                    required
                    className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleFormChange}
                  required
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Address Line 1 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="addressLine1"
                  value={form.addressLine1}
                  onChange={handleFormChange}
                  required
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Address Line 2
                </label>
                <input
                  type="text"
                  name="addressLine2"
                  value={form.addressLine2}
                  onChange={handleFormChange}
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">
                    Postal Code <span className="text-red-500">*</span>
                    {postalLookupLoading && (
                      <span className="text-xs text-blue-500 font-normal ml-2">Looking up...</span>
                    )}
                  </label>
                  <input
                    type="text"
                    name="postalCode"
                    value={form.postalCode}
                    onChange={handlePostalCodeChange}
                    required
                    maxLength={6}
                    placeholder="Enter 6-digit PIN"
                    className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={form.city}
                    onChange={handleFormChange}
                    required
                    className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">
                    State <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="state"
                    value={form.state}
                    onChange={handleFormChange}
                    required
                    className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Country <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="country"
                  value={form.country}
                  onChange={handleFormChange}
                  required
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">
                    Latitude
                  </label>
                  <input
                    type="number"
                    name="latitude"
                    value={form.latitude}
                    onChange={handleFormChange}
                    step="any"
                    className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">
                    Longitude
                  </label>
                  <input
                    type="number"
                    name="longitude"
                    value={form.longitude}
                    onChange={handleFormChange}
                    step="any"
                    className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="px-4 py-1.5 text-sm rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                  onClick={() => setFormDialog({ open: false, mode: "add", warehouseId: null })}
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
      {deleteDialog.open && deleteDialog.warehouse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Delete Warehouse</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete{" "}
              <span className="font-semibold">{deleteDialog.warehouse.warehouseName}</span>
              {" "}({deleteDialog.warehouse.warehouseCode})? This will mark it as inactive.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="px-4 py-1.5 text-sm rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                onClick={() => setDeleteDialog({ open: false, warehouse: null })}
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
                {deleteLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminWarehousesPage;
