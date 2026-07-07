"use client";
import { DashboardSidebar } from "@/components";
import React, { useEffect, useRef, useState } from "react";
import { showToast, showError } from "@/lib/toast";
import { API_BASE } from "@/lib/env";

interface Category {
  id: number;
  title: string;
  description: string;
  href: string;
  src: string;
}

const DashboardCategory = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Add Category dialog state
  const [addDialog, setAddDialog] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // View/Edit dialog state
  const [viewDialog, setViewDialog] = useState<{ open: boolean; category: Category | null }>({ open: false, category: null });
  const [viewLoading, setViewLoading] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", description: "" });
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [updateLoading, setUpdateLoading] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: number; title: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchCategories = () => {
    setLoading(true);
    setError("");
    fetch(`${API_BASE}/products/categories`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch categories");
        return res.json();
      })
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message || "Error fetching categories"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const t = setTimeout(() => fetchCategories(), 0);
    return () => clearTimeout(t);
  }, []);

  const handleViewEdit = async (id: number) => {
    setViewLoading(true);
    setViewDialog({ open: true, category: null });
    try {
      const res = await fetch(`${API_BASE}/products/categories/${id}`);
      if (!res.ok) throw new Error("Failed to fetch category details");
      const data: Category = await res.json();
      setViewDialog({ open: true, category: data });
      setEditForm({ name: data.title, description: data.description || "" });
      setEditImageFile(null);
      setEditImagePreview(null);
    } catch (err: any) {
      showError(err.message || "Failed to fetch category details");
      setViewDialog({ open: false, category: null });
    } finally {
      setViewLoading(false);
    }
  };

  const handleDelete = async (id: number, title: string) => {
    setDeleteConfirm({ open: true, id, title });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`${API_BASE}/products/categories/${deleteConfirm.id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error("Failed to delete category");
      showToast("Category deleted successfully!");
      setDeleteConfirm(null);
      fetchCategories();
    } catch (err: any) {
      showError(err.message || "Failed to delete category");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setEditImageFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setEditImagePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setEditImagePreview(null);
    }
  };

  const handleUpdate = async () => {
    if (!viewDialog.category) return;
    if (!editForm.name.trim()) { showError("Category name is required."); return; }
    setUpdateLoading(true);
    try {
      const fd = new FormData();
      fd.append("category", JSON.stringify({
        name: editForm.name.trim(),
        description: editForm.description.trim(),
      }));
      if (editImageFile) fd.append("image", editImageFile);
      const res = await fetch(`${API_BASE}/products/categories/${viewDialog.category.id}`, {
        method: "PUT",
        body: fd,
      });
      if (!res.ok) throw new Error("Failed to update category");
      const updated: Category = await res.json();
      showToast("Category updated successfully!");
      setViewDialog({ open: false, category: null });
      setEditImageFile(null);
      setEditImagePreview(null);
      fetchCategories();
    } catch (err: any) {
      showError(err.message || "Failed to update category");
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setImageFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { showError("Category name is required."); return; }
    if (!imageFile) { showError("Please select a category image."); return; }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("category", JSON.stringify({
        name: form.name.trim(),
        description: form.description.trim(),
      }));
      fd.append("image", imageFile);

      const res = await fetch(`${API_BASE}/products/categories`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error("Failed to add category");
      showToast("Category added successfully!");
      setAddDialog(false);
      setForm({ name: "", description: "" });
      setImageFile(null);
      setImagePreview(null);
      fetchCategories();
    } catch (err: any) {
      showError(err.message || "Failed to add category");
    } finally {
      setSubmitting(false);
    }
  };

  const openAddDialog = () => {
    setForm({ name: "", description: "" });
    setImageFile(null);
    setImagePreview(null);
    setAddDialog(true);
  };

  return (
    <div className="bg-white flex flex-col min-h-screen max-w-screen-2xl mx-auto">
      <DashboardSidebar />
      <div className="flex-1 p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">All Categories</h1>
          <button
            type="button"
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 font-semibold"
            onClick={openAddDialog}
          >
            + Add New Category
          </button>
        </div>

        {loading ? (
          <div className="text-center py-10 text-gray-500">Loading...</div>
        ) : error ? (
          <div className="text-center py-10 text-red-600">{error}</div>
        ) : categories.length === 0 ? (
          <div className="text-center py-10 text-gray-500">No categories found.</div>
        ) : (
          <div className="overflow-x-auto rounded border">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Image</th>
                  <th className="text-left px-4 py-3 font-semibold">Title</th>
                  <th className="text-left px-4 py-3 font-semibold">Description</th>
                  <th className="text-left px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3">
                      {category.src ? (
                        <img
                          src={category.src}
                          alt={category.title}
                          className="w-12 h-12 object-cover rounded border"
                          onError={(e) => { (e.target as HTMLImageElement).src = "/product_placeholder.jpg"; }}
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-100 rounded border flex items-center justify-center text-gray-400 text-xs">No img</div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{category.title}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-md">
                      <p className="line-clamp-2">{category.description}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          className="text-xs text-blue-600 font-semibold hover:underline"
                          onClick={() => handleViewEdit(category.id)}
                        >
                          View / Edit
                        </button>
                        <button
                          type="button"
                          className="text-xs text-red-500 font-semibold hover:underline"
                          onClick={() => handleDelete(category.id, category.title)}
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

      {/* View / Edit Category Dialog */}
      {viewDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold">Category Details</h3>
              <button
                type="button"
                className="text-sm text-gray-500 hover:text-gray-700"
                onClick={() => setViewDialog({ open: false, category: null })}
              >
                Close
              </button>
            </div>

            {viewLoading ? (
              <div className="text-center py-10 text-gray-500">Loading...</div>
            ) : viewDialog.category ? (
              <div className="flex flex-col gap-4 text-sm">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Title <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    className="border rounded px-3 py-2 text-sm w-full"
                    value={editForm.name}
                    onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                  <textarea
                    className="border rounded px-3 py-2 text-sm w-full resize-y"
                    rows={3}
                    value={editForm.description}
                    onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                  />
                </div>

                {/* Image preview + upload */}
                <div className="flex flex-col items-center gap-2">
                  <img
                    src={editImagePreview || viewDialog.category.src || "/product_placeholder.jpg"}
                    alt={viewDialog.category.title}
                    className="w-32 h-32 object-cover rounded border"
                    onError={(e) => { (e.target as HTMLImageElement).src = "/product_placeholder.jpg"; }}
                  />
                  <input
                    ref={editFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleEditImageChange}
                  />
                  <button
                    type="button"
                    className="px-3 py-1 border rounded text-xs text-gray-600 hover:bg-gray-50"
                    onClick={() => editFileInputRef.current?.click()}
                  >
                    {editImageFile ? editImageFile.name : "Change Image"}
                  </button>
                </div>

                <div className="flex justify-center mt-2">
                  <button
                    type="button"
                    className="px-8 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 font-semibold disabled:opacity-60"
                    disabled={updateLoading}
                    onClick={handleUpdate}
                  >
                    {updateLoading ? "Updating..." : "Update"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Add Category Dialog */}
      {addDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold">Add New Category</h3>
              <button
                type="button"
                className="text-sm text-gray-500 hover:text-gray-700"
                onClick={() => setAddDialog(false)}
              >
                Close
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="border rounded px-3 py-2 text-sm w-full"
                  placeholder="e.g. Beverages"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <textarea
                  className="border rounded px-3 py-2 text-sm w-full resize-y"
                  rows={3}
                  placeholder="Category description..."
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Image <span className="text-red-500">*</span>
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
                <button
                  type="button"
                  className="px-4 py-2 border rounded text-sm text-gray-600 hover:bg-gray-50 w-full text-left"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {imageFile ? imageFile.name : "Choose image..."}
                </button>
                {imagePreview && (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="mt-2 w-24 h-24 object-cover rounded border"
                  />
                )}
              </div>

              <div className="flex justify-center mt-2">
                <button
                  type="submit"
                  className="px-8 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 font-semibold disabled:opacity-60"
                  disabled={submitting}
                >
                  {submitting ? "Saving..." : "Add Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Delete Confirmation Popup */}
      {deleteConfirm?.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded shadow-xl w-full max-w-sm p-6">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-gray-900">Delete Category</h3>
              <p className="text-sm text-gray-500">
                Are you sure you want to delete <span className="font-semibold text-gray-800">&ldquo;{deleteConfirm.title}&rdquo;</span>? This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-center gap-3 mt-6">
              <button
                type="button"
                className="px-6 py-2 text-sm rounded border text-gray-700 hover:bg-gray-50 font-medium"
                onClick={() => setDeleteConfirm(null)}
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-6 py-2 text-sm rounded bg-red-600 text-white hover:bg-red-700 font-semibold disabled:opacity-60"
                onClick={confirmDelete}
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

export default DashboardCategory;



