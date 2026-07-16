"use client";
import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

import { API_BASE } from "@/lib/env";


interface Product {
  id: number;
  title: string;
  description: string;
  price: number;
  mrp: number;
  currency: string;
  category: string;
  sku: string;
  mainImage: string;
  slug: string;
  inStock: number;
  stock: number;
}

interface Category {
  id: number;
  title: string;
}

const DashboardProductTable = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Add product dialog
  const [addDialog, setAddDialog] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({ name: "", description: "", categoryId: "", slug: "" });
  const [submitting, setSubmitting] = useState(false);

  // View/Edit product dialog
  const [editDialog, setEditDialog] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", description: "", categoryId: "", slug: "" });
  const [editProductId, setEditProductId] = useState<number | null>(null);
  const editProductIdRef = useRef<number | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Variant dialog
  const [variantDialog, setVariantDialog] = useState(false);
  const [variantProductId, setVariantProductId] = useState<number | null>(null);
  const [variantProductTitle, setVariantProductTitle] = useState("");
  const [variants, setVariants] = useState<any[]>([]);
  const [variantLoading, setVariantLoading] = useState(false);

  // Add variant dialog
  const [addVariantDialog, setAddVariantDialog] = useState(false);
  const [addVariantForm, setAddVariantForm] = useState({ skuCode: "", packSize: "", uom: "", containerType: "", mrp: "", sellingPrice: "", length: "", breadth: "", height: "", weight: "" });
  const [addVariantImages, setAddVariantImages] = useState<File[]>([]);
  const addVariantImageInputRef = useRef<HTMLInputElement>(null);
  const [addVariantMainImageIndex, setAddVariantMainImageIndex] = useState<number>(0);
  const [addVariantVideo, setAddVariantVideo] = useState<File | null>(null);
  const addVariantVideoInputRef = useRef<HTMLInputElement>(null);
  const [addVariantSubmitting, setAddVariantSubmitting] = useState(false);

  // Attribute sub-dialog
  const [attrDialog, setAttrDialog] = useState<{ open: boolean; variantId: number; skuCode: string; attributes: any[] } | null>(null);

  // Attribute add/edit dialog state
  const [attrEditDialog, setAttrEditDialog] = useState<{ open: boolean; mode: 'add' | 'edit'; attribute?: any } | null>(null);
  const [attrEditForm, setAttrEditForm] = useState({ attributeName: '', attributeValue: '' });
  const [attrEditSubmitting, setAttrEditSubmitting] = useState(false);

  // Attribute delete dialog state
  const [attrDeleteDialog, setAttrDeleteDialog] = useState<{ open: boolean; attribute: any } | null>(null);
  const [attrDeleteSubmitting, setAttrDeleteSubmitting] = useState(false);

  // Edit variant dialog
  const [editVariantDialog, setEditVariantDialog] = useState(false);
  const [editVariantId, setEditVariantId] = useState<number | null>(null);
  const [editVariantSkuLabel, setEditVariantSkuLabel] = useState("");
  const [editVariantForm, setEditVariantForm] = useState({ skuCode: "", packSize: "", uom: "", containerType: "", mrp: "", sellingPrice: "", length: "", breadth: "", height: "", weight: "" });
  const editVariantFormRef = useRef({ skuCode: "", packSize: "", uom: "", containerType: "", mrp: "", sellingPrice: "", length: "", breadth: "", height: "", weight: "" });
  editVariantFormRef.current = editVariantForm;
  const [editVariantSubmitting, setEditVariantSubmitting] = useState(false);

  // Edit variant — image management
  const [editVariantImages, setEditVariantImages] = useState<any[]>([]);
  const [editVariantImagesLoading, setEditVariantImagesLoading] = useState(false);
  const [editVariantNewImages, setEditVariantNewImages] = useState<File[]>([]);
  const [editVariantSelectedMain, setEditVariantSelectedMain] = useState<string>(""); // "existing-{id}" | "new-{idx}"
  const editVariantNewImgRef = useRef<HTMLInputElement>(null);
  const [editVariantImgUploading, setEditVariantImgUploading] = useState(false);

  // Edit variant — video management
  const [editVariantVideoUrl, setEditVariantVideoUrl] = useState<string | null>(null);
  const [editVariantNewVideo, setEditVariantNewVideo] = useState<File | null>(null);
  const editVariantVideoRef = useRef<HTMLInputElement>(null);

  const fetchEditVariantImages = async (variantId: number) => {
    setEditVariantImagesLoading(true);
    try {
      const res = await fetch(`${API_BASE}/products/productImage/${variantId}`);
      const data = await res.json();
      const imgs = Array.isArray(data) ? data : [];
      setEditVariantImages(imgs);
      // Auto-select current main
      const mainImg = imgs.find((i: any) => i.isMainImage === "Y");
      setEditVariantSelectedMain(mainImg ? `existing-${mainImg.id}` : (imgs.length > 0 ? `existing-${imgs[0].id}` : ""));
    } catch { setEditVariantImages([]); }
    finally { setEditVariantImagesLoading(false); }
  };
  const [deleteVariantConfirm, setDeleteVariantConfirm] = useState<{ open: boolean; variantId: number; skuCode: string } | null>(null);
  const [deleteVariantLoading, setDeleteVariantLoading] = useState(false);

  // Inventory dialog
  const [inventoryDialog, setInventoryDialog] = useState(false);
  const [inventoryVariantId, setInventoryVariantId] = useState<number | null>(null);
  const [inventorySkuLabel, setInventorySkuLabel] = useState("");
  const [inventoryForm, setInventoryForm] = useState({ qty: "", whid: "", availableQty: "" });
  const [inventoryId, setInventoryId] = useState<number | null>(null); // null = add, number = edit
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventorySubmitting, setInventorySubmitting] = useState(false);

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: number; title: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // UOM list for dropdowns
  const [uomList, setUomList] = useState<{ uomCode: string; uomName: string }[]>([]);

  useEffect(() => {
    fetch(`${API_BASE}/products/uom`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setUomList(Array.isArray(data) ? data.map((u: any) => ({ uomCode: u.uomCode, uomName: u.uomName })) : []))
      .catch(() => {});
  }, []);

  const fetchProducts = () => {
    setLoading(true);
    fetch(`${API_BASE}/products/product`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch products");
        return res.json();
      })
      .then((data) => setProducts(Array.isArray(data) ? data : []))
      .catch((err) => {
        setError(err.message || "Error fetching products");
        toast.error(err.message || "Error fetching products");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const openAddDialog = () => {
    setForm({ name: "", description: "", categoryId: "", slug: "" });
    fetch(`${API_BASE}/products/categories`)
      .then((res) => res.json())
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => setCategories([]));
    setAddDialog(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Product name is required."); return; }
    if (!form.categoryId) { toast.error("Please select a category."); return; }
    if (!form.slug.trim()) { toast.error("Slug is required."); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/products/product`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim(),
          categoryId: Number(form.categoryId),
          slug: form.slug.trim(),
        }),
      });
      if (!res.ok) throw new Error("Failed to create product");
      toast.success("Product created successfully!");
      setAddDialog(false);
      fetchProducts();
    } catch (err: any) {
      toast.error(err.message || "Failed to create product");
    } finally {
      setSubmitting(false);
    }
  };

  const openEditDialog = async (slug: string, categoryName?: string) => {
    if (!slug) { toast.error("Product slug is missing."); return; }
    setEditDialog(true);
    setEditLoading(true);
    try {
      const [productRes, catsRes] = await Promise.all([
        fetch(`${API_BASE}/products/productSlug/${encodeURIComponent(slug)}`),
        fetch(`${API_BASE}/products/categories`),
      ]);
      if (!productRes.ok) throw new Error("Failed to fetch product");
      const data = await productRes.json();
      const catsData = catsRes.ok ? await catsRes.json() : [];
      const cats = Array.isArray(catsData) ? catsData : [];
      setCategories(cats);
      editProductIdRef.current = data.id ?? null;
      setEditProductId(data.id ?? null);
      // Use category from the list (categoryName) since slug endpoint returns null
      const resolvedCategory = data.category || categoryName || "";
      const matched = cats.find((c: Category) => c.title === resolvedCategory);
      setEditForm({
        name: data.title || "",
        description: data.description || "",
        categoryId: matched ? String(matched.id) : "",
        slug: data.slug || "",
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch product details");
      setEditDialog(false);
    } finally {
      setEditLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/products/${deleteConfirm.id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error(`Server error: ${res.status}`);
      toast.success("Product deleted successfully!");
      setDeleteConfirm(null);
      fetchProducts();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete product");
    } finally {
      setDeleteLoading(false);
    }
  };

  const openVariantDialog = async (idOrSlug: number | string | null, title: string) => {
    setVariants([]);
    setVariantProductTitle(title);
    setVariantLoading(true);
    setVariantDialog(true);
    try {
      let resolvedId: number | null = typeof idOrSlug === 'number' ? idOrSlug : null;
      if (!resolvedId && idOrSlug) {
        // id is null — resolve via slug
        const slugRes = await fetch(`${API_BASE}/products/productSlug/${encodeURIComponent(String(idOrSlug))}`);
        if (!slugRes.ok) throw new Error("Failed to resolve product");
        const slugData = await slugRes.json();
        if (!slugData.id) throw new Error("Product ID not found");
        resolvedId = slugData.id;
      }
      if (!resolvedId) throw new Error("Product ID is missing");
      setVariantProductId(resolvedId);
      const res = await fetch(`${API_BASE}/products/productsVariant/${resolvedId}`);
      if (!res.ok) throw new Error("Failed to fetch variants");
      const data = await res.json();
      setVariants(Array.isArray(data) ? data : (data.variants ?? []));
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch variants");
      setVariants([]);
    } finally {
      setVariantLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.name.trim()) { toast.error("Product name is required."); return; }
    if (!editForm.categoryId) { toast.error("Please select a category."); return; }
    if (!editForm.slug.trim()) { toast.error("Slug is required."); return; }
    // Prefer ref value (always current) over state (may be stale closure)
    const resolvedId = editProductIdRef.current ?? editProductId;
    if (!resolvedId) {
      // Last-resort: re-fetch the real id via slug before submitting
      try {
        const res = await fetch(`${API_BASE}/products/productSlug/${encodeURIComponent(editForm.slug.trim())}`);
        if (!res.ok) throw new Error("Could not resolve product ID");
        const data = await res.json();
        if (!data.id) throw new Error("Product ID not found — this product may not be fully set up in the backend.");
        editProductIdRef.current = data.id;
        setEditProductId(data.id);
        setEditSubmitting(true);
        const putRes = await fetch(`${API_BASE}/api/products/${data.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: editForm.name.trim(),
            description: editForm.description.trim(),
            categoryId: Number(editForm.categoryId),
            slug: editForm.slug.trim(),
          }),
        });
        let putData: any = null;
        try { putData = await putRes.json(); } catch {}
        if (!putRes.ok) throw new Error(putData?.message || putData?.error || `Server error: ${putRes.status}`);
        toast.success("Product updated successfully!");
        setEditDialog(false);
        fetchProducts();
      } catch (err: any) {
        toast.error(err.message || "Failed to update product");
      } finally {
        setEditSubmitting(false);
      }
      return;
    }
    setEditSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/products/${resolvedId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name.trim(),
          description: editForm.description.trim(),
          categoryId: Number(editForm.categoryId),
          slug: editForm.slug.trim(),
        }),
      });
      let resData: any = null;
      try { resData = await res.json(); } catch {}
      if (!res.ok) throw new Error(resData?.message || resData?.error || resData?.responseMessage || `Server error: ${res.status}`);
      toast.success("Product updated successfully!");
      setEditDialog(false);
      fetchProducts();
    } catch (err: any) {
      toast.error(err.message || "Failed to update product");
    } finally {
      setEditSubmitting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(products.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginated = products.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">All Products</h1>
        <button
          type="button"
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 font-semibold"
          onClick={openAddDialog}
        >
          + Add New Product
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-500">Loading...</div>
      ) : error ? (
        <div className="text-center py-10 text-red-600">{error}</div>
      ) : products.length === 0 ? (
        <div className="text-center py-10 text-gray-500">No products found.</div>
      ) : (
        <>
          <div className="overflow-x-auto rounded border">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Title</th>
                  <th className="text-left px-4 py-3 font-semibold">Description</th>
                  <th className="text-left px-4 py-3 font-semibold">Category</th>
                  <th className="text-left px-4 py-3 font-semibold">Actions</th>
                  <th className="text-left px-4 py-3 font-semibold">Variants</th>
                  <th className="text-left px-4 py-3 font-semibold">Delete</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((product) => (
                  <tr key={product.slug || product.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900 max-w-[180px]">
                      <p className="line-clamp-2">{product.title}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-[280px]">
                      <p className="line-clamp-2">{product.description || "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{product.category || "—"}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="text-xs text-blue-600 font-semibold hover:underline text-left"
                        onClick={() => openEditDialog(product.slug, product.category)}
                      >
                        View / Edit
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="text-xs text-indigo-600 font-semibold hover:underline text-left"
                        onClick={() => openVariantDialog(product.id ?? product.slug, product.title)}
                      >
                        View / Edit Variant
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="text-xs text-red-500 font-semibold hover:underline"
                        onClick={() => setDeleteConfirm({ open: true, id: product.id, title: product.title })}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-4 py-4">
              <button
                className="px-3 py-1 text-sm rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={safeCurrentPage === 1}
              >
                «
              </button>
              <span className="text-sm text-gray-600">Page {safeCurrentPage} of {totalPages}</span>
              <button
                className="px-3 py-1 text-sm rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage === totalPages}
              >
                »
              </button>
            </div>
          )}
        </>
      )}

      {/* Add Product Dialog */}
      {addDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold">Add New Product</h3>
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
                  placeholder="e.g. Mysore Pak"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <textarea
                  className="border rounded px-3 py-2 text-sm w-full resize-y"
                  rows={3}
                  placeholder="Product description..."
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  className="border rounded px-3 py-2 text-sm w-full"
                  value={form.categoryId}
                  onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
                >
                  <option value="">Select category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Slug <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="border rounded px-3 py-2 text-sm w-full"
                  placeholder="e.g. mysore-pak"
                  value={form.slug}
                  onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                />
              </div>
              <div className="flex justify-center mt-2">
                <button
                  type="submit"
                  className="px-8 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 font-semibold disabled:opacity-60"
                  disabled={submitting}
                >
                  {submitting ? "Saving..." : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View / Edit Product Dialog */}
      {editDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold">Edit Product</h3>
              <button type="button" className="text-sm text-gray-500 hover:text-gray-700" onClick={() => setEditDialog(false)}>Close</button>
            </div>
            {editLoading ? (
              <div className="text-center py-10 text-gray-500">Loading...</div>
            ) : (
              <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Name <span className="text-red-500">*</span></label>
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
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Category <span className="text-red-500">*</span></label>
                  <select
                    className="border rounded px-3 py-2 text-sm w-full"
                    value={editForm.categoryId}
                    onChange={e => setEditForm(f => ({ ...f, categoryId: e.target.value }))}
                  >
                    <option value="">Select category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Slug <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    className="border rounded px-3 py-2 text-sm w-full"
                    value={editForm.slug}
                    onChange={e => setEditForm(f => ({ ...f, slug: e.target.value }))}
                  />
                </div>
                <div className="flex justify-center mt-2">
                  <button
                    type="submit"
                    className="px-8 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 font-semibold disabled:opacity-60"
                    disabled={editSubmitting}
                  >
                    {editSubmitting ? "Saving..." : "Update"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Variant Dialog */}
      {variantDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold">Product Variants — <span className="text-blue-700">{variantProductTitle}</span></h3>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-3 py-1.5 rounded"
                  onClick={() => {
                    setAddVariantForm({ skuCode: "", packSize: "", uom: "", containerType: "", mrp: "", sellingPrice: "", length: "", breadth: "", height: "", weight: "" });
                    setAddVariantImages([]);
                    setAddVariantMainImageIndex(0);
                    setAddVariantVideo(null);
                    setAddVariantDialog(true);
                  }}
                >
                  + Add New Variant
                </button>
                <button type="button" className="text-sm text-gray-500 hover:text-gray-700" onClick={() => setVariantDialog(false)}>Close</button>
              </div>
            </div>
            {variantLoading ? (
              <div className="text-center py-10 text-gray-500">Loading...</div>
            ) : variants.length === 0 ? (
              <div className="text-center py-10 text-gray-400">No variants found for this product.</div>
            ) : (
              <div className="overflow-x-auto rounded border">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-700">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold">Image</th>
                      <th className="text-left px-3 py-2 font-semibold">SKU</th>
                      <th className="text-left px-3 py-2 font-semibold">Pack Size</th>
                      <th className="text-left px-3 py-2 font-semibold">UOM</th>
                      <th className="text-left px-3 py-2 font-semibold">MRP</th>
                      <th className="text-left px-3 py-2 font-semibold">Selling Price</th>
                      <th className="text-left px-3 py-2 font-semibold">Attributes</th>
                      <th className="text-left px-3 py-2 font-semibold">Action</th>
                      <th className="text-left px-3 py-2 font-semibold">Delete</th>
                    </tr>
                  </thead>
                  <tbody>
                    {variants.filter((v: any) => v.status === "A").map((v: any) => (
                      <tr key={v.variantId} className="border-t hover:bg-gray-50 align-top">
                        <td className="px-3 py-2">
                          {v.productImages && v.productImages.length > 0 ? (
                            <img
                              src={v.productImages[0]?.image || "/product_placeholder.jpg"}
                              alt="variant"
                              className="w-12 h-12 object-cover rounded border"
                              onError={(e) => { (e.target as HTMLImageElement).src = "/product_placeholder.jpg"; }}
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-100 rounded border flex items-center justify-center text-gray-400 text-xs">No img</div>
                          )}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-gray-700">{v.skuCode || "—"}</td>
                        <td className="px-3 py-2 text-gray-700">{v.packSize || "—"}</td>
                        <td className="px-3 py-2 text-gray-700">{v.uom || "—"}</td>
                        <td className="px-3 py-2 text-gray-700">{v.mrp != null ? v.mrp.toFixed(2) : "—"}</td>
                        <td className="px-3 py-2 text-gray-700">{v.sellingPrice != null ? v.sellingPrice.toFixed(2) : "—"}</td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            className="text-xs text-blue-600 font-semibold hover:underline"
                            onClick={() => setAttrDialog({ open: true, variantId: v.variantId, skuCode: v.skuCode || `#${v.variantId}`, attributes: v.attributes || [] })}
                          >
                            View / Edit ({v.attributes?.length ?? 0})
                          </button>
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            className="text-xs text-indigo-600 font-semibold hover:underline"
                            onClick={() => {
                              setEditVariantId(v.variantId);
                              setEditVariantSkuLabel(v.skuCode || `#${v.variantId}`);
                              setEditVariantForm({
                                skuCode: v.skuCode || "",
                                packSize: v.packSize || "",
                                uom: v.uom || "",
                                containerType: v.containerType || "",
                                mrp: v.mrp != null ? String(v.mrp) : "",
                                sellingPrice: v.sellingPrice != null ? String(v.sellingPrice) : "",
                                length: v.length != null ? String(v.length) : "",
                                breadth: v.breadth != null ? String(v.breadth) : "",
                                height: v.height != null ? String(v.height) : "",
                                weight: v.weight != null ? String(v.weight) : "",
                              });
                              setEditVariantNewImages([]);
                              setEditVariantSelectedMain("");
                              setEditVariantVideoUrl(v.videoUrl || null);
                              setEditVariantNewVideo(null);
                              fetchEditVariantImages(v.variantId);
                              setEditVariantDialog(true);
                            }}
                          >
                            View / Edit
                          </button>
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            className="text-xs text-red-500 font-semibold hover:underline"
                            onClick={() => setDeleteVariantConfirm({ open: true, variantId: v.variantId, skuCode: v.skuCode || `#${v.variantId}` })}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Variant Dialog */}
      {editVariantDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold">View / Edit Product Variant — <span className="text-indigo-700">{editVariantSkuLabel}</span></h3>
              <button type="button" className="text-sm text-gray-500 hover:text-gray-700" onClick={() => setEditVariantDialog(false)}>Close</button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!editVariantId) return;
                setEditVariantSubmitting(true);
                try {
                  const fd = new FormData();
                  const variantPayload: Record<string, any> = { variantId: editVariantId };
                  if (editVariantFormRef.current.skuCode) variantPayload.skuCode = editVariantFormRef.current.skuCode;
                  if (editVariantFormRef.current.packSize) variantPayload.packSize = editVariantFormRef.current.packSize;
                  if (editVariantFormRef.current.uom) variantPayload.uom = editVariantFormRef.current.uom;
                  if (editVariantFormRef.current.containerType) variantPayload.containerType = editVariantFormRef.current.containerType;
                  if (editVariantFormRef.current.mrp) variantPayload.mrp = parseFloat(editVariantFormRef.current.mrp);
                  if (editVariantFormRef.current.sellingPrice) variantPayload.sellingPrice = parseFloat(editVariantFormRef.current.sellingPrice);
                  if (editVariantFormRef.current.length) variantPayload.length = parseFloat(editVariantFormRef.current.length);
                  if (editVariantFormRef.current.breadth) variantPayload.breadth = parseFloat(editVariantFormRef.current.breadth);
                  if (editVariantFormRef.current.height) variantPayload.height = parseFloat(editVariantFormRef.current.height);
                  if (editVariantFormRef.current.weight) variantPayload.weight = parseFloat(editVariantFormRef.current.weight);
                  variantPayload.status = "A";
                  fd.append("productVariant", new Blob([JSON.stringify(variantPayload)], { type: "application/json" }));
                  // Append pending video if any
                  if (editVariantNewVideo) {
                    fd.append("video", editVariantNewVideo, editVariantNewVideo.name);
                  }
                  // Append any pending new images
                  if (editVariantNewImages.length > 0) {
                    editVariantNewImages.forEach(f => fd.append("images", f, f.name));
                    const mainMatch = editVariantSelectedMain.match(/^new-(\d+)$/);
                    if (mainMatch) {
                      fd.append("mainImageIndex", String(Math.min(parseInt(mainMatch[1]), editVariantNewImages.length - 1)));
                    } else {
                      fd.append("mainImageIndex", "-1");
                    }
                  }
                  const res = await fetch(`${API_BASE}/products/productsVariant`, {
                    method: "PUT",
                    body: fd,
                  });
                  if (!res.ok) throw new Error("Failed to update variant");
                  // If an existing image is selected as main, apply it now
                  if (editVariantSelectedMain.startsWith("existing-")) {
                    const selId = parseInt(editVariantSelectedMain.replace("existing-", ""));
                    const cur = editVariantImages.find((i: any) => i.id === selId);
                    if (cur && cur.isMainImage !== "Y") {
                      await fetch(`${API_BASE}/products/productImage/${selId}/main`, { method: "PUT" }).catch(() => {});
                    }
                  }
                  setEditVariantNewImages([]);
                  setEditVariantNewVideo(null);
                  // Refresh videoUrl from response
                  const resData = await res.clone().json().catch(() => null);
                  if (resData?.videoUrl !== undefined) setEditVariantVideoUrl(resData.videoUrl || null);
                  toast.success("Variant updated successfully");
                  setEditVariantDialog(false);
                  if (variantProductId) {
                    setVariantLoading(true);
                    const vRes = await fetch(`${API_BASE}/products/productsVariant/${variantProductId}`);
                    const vData = await vRes.json();
                    setVariants(Array.isArray(vData) ? vData : vData.variants || []);
                    setVariantLoading(false);
                  }
                } catch (err: any) {
                  toast.error(err.message || "Failed to update variant");
                } finally {
                  setEditVariantSubmitting(false);
                }
              }}
              className="space-y-3"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SKU Code</label>
                  <input className="border rounded px-3 py-2 w-full text-sm" value={editVariantForm.skuCode} onChange={e => setEditVariantForm(f => ({ ...f, skuCode: e.target.value }))} placeholder="e.g. SKU-001" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pack Size</label>
                  <input className="border rounded px-3 py-2 w-full text-sm" value={editVariantForm.packSize} onChange={e => setEditVariantForm(f => ({ ...f, packSize: e.target.value }))} placeholder="e.g. 500g" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">UOM</label>
                  <select className="border rounded px-3 py-2 w-full text-sm bg-white" value={editVariantForm.uom} onChange={e => setEditVariantForm(f => ({ ...f, uom: e.target.value }))}>
                    <option value="">— Select UOM —</option>
                    {uomList.map(u => (
                      <option key={u.uomCode} value={u.uomCode}>{u.uomCode} — {u.uomName}</option>
                    ))}
                    {editVariantForm.uom && !uomList.find(u => u.uomCode === editVariantForm.uom) && (
                      <option value={editVariantForm.uom}>{editVariantForm.uom}</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Container Type</label>
                  <input className="border rounded px-3 py-2 w-full text-sm" value={editVariantForm.containerType} onChange={e => setEditVariantForm(f => ({ ...f, containerType: e.target.value }))} placeholder="e.g. Pouch" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">MRP</label>
                  <input type="number" step="0.01" className="border rounded px-3 py-2 w-full text-sm" value={editVariantForm.mrp} onChange={e => setEditVariantForm(f => ({ ...f, mrp: e.target.value }))} placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price</label>
                  <input type="number" step="0.01" className="border rounded px-3 py-2 w-full text-sm" value={editVariantForm.sellingPrice} onChange={e => setEditVariantForm(f => ({ ...f, sellingPrice: e.target.value }))} placeholder="0.00" />
                </div>
              </div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-1">Dimensions & Weight</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Length (cm)</label>
                  <input type="number" step="0.01" min="0" className="border rounded px-3 py-2 w-full text-sm" value={editVariantForm.length} onChange={e => setEditVariantForm(f => ({ ...f, length: e.target.value }))} placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Breadth (cm)</label>
                  <input type="number" step="0.01" min="0" className="border rounded px-3 py-2 w-full text-sm" value={editVariantForm.breadth} onChange={e => setEditVariantForm(f => ({ ...f, breadth: e.target.value }))} placeholder="0.00" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Height (cm)</label>
                  <input type="number" step="0.01" min="0" className="border rounded px-3 py-2 w-full text-sm" value={editVariantForm.height} onChange={e => setEditVariantForm(f => ({ ...f, height: e.target.value }))} placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weight (g)</label>
                  <input type="number" step="0.001" min="0" className="border rounded px-3 py-2 w-full text-sm" value={editVariantForm.weight} onChange={e => setEditVariantForm(f => ({ ...f, weight: e.target.value }))} placeholder="0.000" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" className="px-4 py-2 text-sm border rounded text-gray-600 hover:bg-gray-50" onClick={() => setEditVariantDialog(false)}>Cancel</button>
                <button type="submit" disabled={editVariantSubmitting} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-60">{editVariantSubmitting ? "Saving..." : "Update Variant"}</button>
              </div>
            </form>

            {/* ── Images section ──────────────────────────────────────── */}
            <div className="mt-5 border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-gray-700">Product Images</p>
                <p className="text-xs text-gray-400">★ Click to set as main image</p>
              </div>

              {editVariantImagesLoading ? (
                <p className="text-xs text-gray-400">Loading images...</p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {/* Existing images */}
                  {editVariantImages.map(img => {
                    const key = `existing-${img.id}`;
                    const isMain = editVariantSelectedMain === key;
                    return (
                      <div
                        key={img.id}
                        onClick={() => setEditVariantSelectedMain(key)}
                        className={`relative cursor-pointer rounded-lg border-2 overflow-hidden w-24 h-24 flex-shrink-0 transition-all ${
                          isMain ? "border-yellow-400 ring-2 ring-yellow-300" : "border-gray-200 hover:border-blue-300"
                        }`}
                      >
                        <img
                          src={img.image || "/product_placeholder.jpg"}
                          alt={img.image || "Product image"}
                          className="w-full h-full object-cover"
                        />
                        {isMain && (
                          <div className="absolute top-1 left-1 bg-yellow-400 text-yellow-900 text-xs font-bold rounded px-1 leading-tight">★</div>
                        )}
                        {/* Delete button */}
                        <button
                          type="button"
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs font-bold leading-none hover:bg-red-600 z-10"
                          onClick={async e => {
                            e.stopPropagation();
                            if (!confirm("Remove this image?")) return;
                            try {
                              const r = await fetch(`${API_BASE}/products/productImage/${img.id}`, { method: "DELETE" });
                              if (!r.ok) throw new Error("Failed to delete image");
                              toast.success("Image removed");
                              // Reset selection if the deleted image was selected
                              if (editVariantSelectedMain === key) {
                                const remaining = editVariantImages.filter((i: any) => i.id !== img.id);
                                if (remaining.length > 0) setEditVariantSelectedMain(`existing-${remaining[0].id}`);
                                else if (editVariantNewImages.length > 0) setEditVariantSelectedMain("new-0");
                                else setEditVariantSelectedMain("");
                              }
                              if (editVariantId) fetchEditVariantImages(editVariantId);
                            } catch (err: any) {
                              toast.error(err.message || "Failed to delete image");
                            }
                          }}
                        >&times;</button>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-center text-xs text-white py-0.5 truncate px-1">
                          {isMain ? "Main" : "Click to set main"}
                        </div>
                      </div>
                    );
                  })}

                  {/* New (pending) images */}
                  {editVariantNewImages.map((f, idx) => {
                    const key = `new-${idx}`;
                    const isMain = editVariantSelectedMain === key;
                    const previewUrl = URL.createObjectURL(f);
                    return (
                      <div
                        key={f.name + f.size}
                        className={`relative cursor-pointer rounded-lg border-2 overflow-hidden w-24 h-24 flex-shrink-0 transition-all ${
                          isMain ? "border-yellow-400 ring-2 ring-yellow-300" : "border-dashed border-blue-300 hover:border-blue-500"
                        }`}
                        onClick={() => setEditVariantSelectedMain(key)}
                      >
                        <img src={previewUrl} alt={f.name} className="w-full h-full object-cover" />
                        {isMain && (
                          <div className="absolute top-1 left-1 bg-yellow-400 text-yellow-900 text-xs font-bold rounded px-1 leading-tight">★</div>
                        )}
                        <div className="absolute top-1 right-1">
                          <button
                            type="button"
                            className="bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs font-bold leading-none"
                            onClick={e => {
                              e.stopPropagation();
                              setEditVariantNewImages(prev => {
                                const updated = prev.filter((_, i) => i !== idx);
                                // If removed image was selected main, reset to first existing or first new
                                setEditVariantSelectedMain(sel => {
                                  if (sel === key) {
                                    if (editVariantImages.length > 0) return `existing-${editVariantImages[0].id}`;
                                    if (updated.length > 0) return `new-0`;
                                    return "";
                                  }
                                  // Shift new-{idx} keys for items after removed
                                  const match = sel.match(/^new-(\d+)$/);
                                  if (match && parseInt(match[1]) > idx) return `new-${parseInt(match[1]) - 1}`;
                                  return sel;
                                });
                                return updated;
                              });
                            }}
                          >&times;</button>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-center text-xs text-white py-0.5 truncate px-1">
                          {isMain ? "Main (new)" : "New"}
                        </div>
                      </div>
                    );
                  })}

                  {/* Add images button */}
                  <label className="relative cursor-pointer rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-400 w-24 h-24 flex-shrink-0 flex flex-col items-center justify-center text-gray-400 hover:text-blue-500 transition-colors">
                    <span className="text-3xl leading-none">+</span>
                    <span className="text-xs mt-1">Add PNG</span>
                    <input
                      ref={editVariantNewImgRef}
                      type="file"
                      accept="image/png"
                      multiple
                      className="sr-only"
                      onChange={e => {
                        if (e.target.files && e.target.files.length > 0) {
                          const newFiles = Array.from(e.target.files);
                          setEditVariantNewImages(prev => {
                            const existing = new Set(prev.map(f => f.name + f.size));
                            return [...prev, ...newFiles.filter(f => !existing.has(f.name + f.size))];
                          });
                        }
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
              )}

              {/* Upload / Set Main actions */}
              {(editVariantNewImages.length > 0 || editVariantSelectedMain.startsWith("existing-")) && (
                <div className="mt-3 flex items-center gap-3 flex-wrap">
                  {/* Set existing main immediately */}
                  {editVariantSelectedMain.startsWith("existing-") && (() => {
                    const selId = parseInt(editVariantSelectedMain.replace("existing-", ""));
                    const cur = editVariantImages.find((i: any) => i.id === selId);
                    return cur && cur.isMainImage !== "Y" ? (
                      <button
                        type="button"
                        className="px-3 py-1.5 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600 font-medium"
                        onClick={async () => {
                          try {
                            const r = await fetch(`${API_BASE}/products/productImage/${selId}/main`, { method: "PUT" });
                            const d = await r.json();
                            if (!r.ok || d.responseStatus === "FAILURE") throw new Error(d.responseMessage || "Failed");
                            toast.success("Main image updated");
                            if (editVariantId) fetchEditVariantImages(editVariantId);
                          } catch (err: any) { toast.error(err.message || "Failed to set main image"); }
                        }}
                      >
                        ★ Set as Main Image
                      </button>
                    ) : null;
                  })()}

                  {/* Upload new images */}
                  {editVariantNewImages.length > 0 && (
                    <button
                      type="button"
                      disabled={editVariantImgUploading}
                      className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60 font-medium"
                      onClick={async () => {
                        if (!editVariantId) return;
                        setEditVariantImgUploading(true);
                        try {
                          const fd = new FormData();
                          fd.append("productVariant", new Blob([JSON.stringify({ variantId: editVariantId })], { type: "application/json" }));
                          editVariantNewImages.forEach(f => fd.append("images", f, f.name));
                          // If selected main is a new image, pass its index
                          const mainMatch = editVariantSelectedMain.match(/^new-(\d+)$/);
                          if (mainMatch) {
                            fd.append("mainImageIndex", String(Math.min(parseInt(mainMatch[1]), editVariantNewImages.length - 1)));
                          } else {
                            fd.append("mainImageIndex", "-1"); // don't change main — keep existing
                          }
                          const r = await fetch(`${API_BASE}/products/productsVariant`, { method: "PUT", body: fd });
                          if (!r.ok) throw new Error("Upload failed");
                          // If an existing image was selected as main and new images uploaded, set it after
                          if (editVariantSelectedMain.startsWith("existing-")) {
                            const selId = parseInt(editVariantSelectedMain.replace("existing-", ""));
                            await fetch(`${API_BASE}/products/productImage/${selId}/main`, { method: "PUT" }).catch(() => {});
                          }
                          toast.success("Images uploaded successfully");
                          setEditVariantNewImages([]);
                          fetchEditVariantImages(editVariantId);
                        } catch (err: any) {
                          toast.error(err.message || "Upload failed");
                        } finally {
                          setEditVariantImgUploading(false);
                        }
                      }}
                    >
                      {editVariantImgUploading ? "Uploading..." : `Upload ${editVariantNewImages.length} Image${editVariantNewImages.length > 1 ? "s" : ""}`}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* ── Video section ──────────────────────────────────────── */}
            <div className="mt-5 border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-gray-700">Product Video</p>
                <p className="text-xs text-gray-400">MP4, MOV, AVI, WEBM · max 1 video</p>
              </div>

              {/* Existing video player */}
              {editVariantVideoUrl && !editVariantNewVideo && (
                <div className="mb-3">
                  <video
                    key={editVariantVideoUrl}
                    controls
                    className="w-full rounded-lg border border-gray-200 max-h-48 bg-black"
                    src={editVariantVideoUrl || ''}
                  />
                  <p className="text-xs text-gray-400 mt-1 truncate">{editVariantVideoUrl}</p>
                </div>
              )}

              {/* New video preview */}
              {editVariantNewVideo && (
                <div className="mb-3">
                  <video
                    key={editVariantNewVideo.name}
                    controls
                    className="w-full rounded-lg border-2 border-dashed border-blue-400 max-h-48 bg-black"
                    src={URL.createObjectURL(editVariantNewVideo)}
                  />
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-blue-600 truncate">{editVariantNewVideo.name} <span className="text-gray-400">(pending — will save on Update Variant)</span></p>
                    <button
                      type="button"
                      className="text-xs text-red-500 hover:underline ml-2 flex-shrink-0"
                      onClick={() => setEditVariantNewVideo(null)}
                    >Remove</button>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 flex-wrap items-center">
                <label className="cursor-pointer px-3 py-1.5 text-xs bg-gray-100 border border-gray-300 text-gray-700 rounded hover:bg-gray-200 font-medium">
                  {editVariantVideoUrl ? "Replace Video" : "Add Video"}
                  <input
                    ref={editVariantVideoRef}
                    type="file"
                    accept="video/mp4,video/quicktime,video/x-msvideo,video/webm,.mp4,.mov,.avi,.webm"
                    className="sr-only"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) setEditVariantNewVideo(f);
                      e.target.value = "";
                    }}
                  />
                </label>
                {editVariantVideoUrl && !editVariantNewVideo && (
                  <button
                    type="button"
                    className="px-3 py-1.5 text-xs bg-red-50 border border-red-300 text-red-600 rounded hover:bg-red-100 font-medium"
                    onClick={async () => {
                      if (!editVariantId) return;
                      if (!confirm("Delete the existing video? This cannot be undone.")) return;
                      try {
                        const r = await fetch(`${API_BASE}/products/productsVariant/${editVariantId}/video`, { method: "DELETE" });
                        const d = await r.json().catch(() => ({}));
                        if (!r.ok || d.responseStatus === "FAILURE") throw new Error(d.responseMessage || "Failed to delete video");
                        setEditVariantVideoUrl(null);
                        toast.success("Video deleted");
                      } catch (err: any) {
                        toast.error(err.message || "Failed to delete video");
                      }
                    }}
                  >
                    Delete Video
                  </button>
                )}
                {editVariantNewVideo && (
                  <span className="text-xs text-blue-600 self-center">✓ Video will be saved when you click <strong>Update Variant</strong></span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add New Variant Dialog */}
      {addVariantDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold">Add New Variant — <span className="text-blue-700">{variantProductTitle}</span></h3>
              <button type="button" className="text-sm text-gray-500 hover:text-gray-700" onClick={() => setAddVariantDialog(false)}>Close</button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!variantProductId) return;
                // Validate video size before uploading (must match server limit)
                const MAX_VIDEO_BYTES = 200 * 1024 * 1024; // 200MB
                if (addVariantVideo && addVariantVideo.size > MAX_VIDEO_BYTES) {
                  toast.error(`Video file is too large (${(addVariantVideo.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed size is 200 MB.`);
                  return;
                }
                setAddVariantSubmitting(true);
                try {
                  const formData = new FormData();
                  const variantPayload = {
                    productId: variantProductId,
                    skuCode: addVariantForm.skuCode,
                    packSize: addVariantForm.packSize,
                    uom: addVariantForm.uom,
                    containerType: addVariantForm.containerType || null,
                    mrp: addVariantForm.mrp ? parseFloat(addVariantForm.mrp) : null,
                    sellingPrice: addVariantForm.sellingPrice ? parseFloat(addVariantForm.sellingPrice) : null,
                    length: addVariantForm.length ? parseFloat(addVariantForm.length) : null,
                    breadth: addVariantForm.breadth ? parseFloat(addVariantForm.breadth) : null,
                    height: addVariantForm.height ? parseFloat(addVariantForm.height) : null,
                    weight: addVariantForm.weight ? parseFloat(addVariantForm.weight) : null,
                    status: "A",
                  };
                  formData.append(
                    "productVariant",
                    new Blob([JSON.stringify(variantPayload)], { type: "application/json" })
                  );
                  if (addVariantImages.length > 0) {
                    addVariantImages.forEach((file) => {
                      formData.append("images", file, file.name);
                    });
                    formData.append("mainImageIndex", String(Math.min(addVariantMainImageIndex, addVariantImages.length - 1)));
                  }
                  if (addVariantVideo) {
                    formData.append("video", addVariantVideo, addVariantVideo.name);
                  }
                  const res = await fetch(`${API_BASE}/products/productsVariant`, {
                    method: "POST",
                    body: formData,
                  });
                  if (!res.ok) throw new Error("Failed to add variant");
                  toast.success("Variant added successfully");
                  setAddVariantDialog(false);
                  setAddVariantImages([]);
                  setAddVariantMainImageIndex(0);
                  setAddVariantVideo(null);
                  setVariantLoading(true);
                  const vRes = await fetch(`${API_BASE}/products/productsVariant/${variantProductId}`);
                  const vData = await vRes.json();
                  setVariants(Array.isArray(vData) ? vData : vData.variants || []);
                  setVariantLoading(false);
                } catch (err: any) {
                  toast.error(err.message || "Failed to add variant");
                } finally {
                  setAddVariantSubmitting(false);
                }
              }}
              className="space-y-3"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SKU Code <span className="text-red-500">*</span></label>
                  <input required className="border rounded px-3 py-2 w-full text-sm" value={addVariantForm.skuCode} onChange={e => setAddVariantForm(f => ({ ...f, skuCode: e.target.value }))} placeholder="e.g. SKU-OIL-500ML" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pack Size <span className="text-red-500">*</span></label>
                  <input required className="border rounded px-3 py-2 w-full text-sm" value={addVariantForm.packSize} onChange={e => setAddVariantForm(f => ({ ...f, packSize: e.target.value }))} placeholder="e.g. 500ml" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">UOM <span className="text-red-500">*</span></label>
                  <select required className="border rounded px-3 py-2 w-full text-sm bg-white" value={addVariantForm.uom} onChange={e => setAddVariantForm(f => ({ ...f, uom: e.target.value }))}>
                    <option value="">— Select UOM —</option>
                    {uomList.map(u => (
                      <option key={u.uomCode} value={u.uomCode}>{u.uomCode} — {u.uomName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Container Type</label>
                  <input className="border rounded px-3 py-2 w-full text-sm" value={addVariantForm.containerType} onChange={e => setAddVariantForm(f => ({ ...f, containerType: e.target.value }))} placeholder="e.g. Bottle" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">MRP <span className="text-red-500">*</span></label>
                  <input required type="number" step="0.01" min="0" className="border rounded px-3 py-2 w-full text-sm" value={addVariantForm.mrp} onChange={e => setAddVariantForm(f => ({ ...f, mrp: e.target.value }))} placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price <span className="text-red-500">*</span></label>
                  <input required type="number" step="0.01" min="0" className="border rounded px-3 py-2 w-full text-sm" value={addVariantForm.sellingPrice} onChange={e => setAddVariantForm(f => ({ ...f, sellingPrice: e.target.value }))} placeholder="0.00" />
                </div>
              </div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-1">Dimensions & Weight</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Length (cm)</label>
                  <input type="number" step="0.01" min="0" className="border rounded px-3 py-2 w-full text-sm" value={addVariantForm.length} onChange={e => setAddVariantForm(f => ({ ...f, length: e.target.value }))} placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Breadth (cm)</label>
                  <input type="number" step="0.01" min="0" className="border rounded px-3 py-2 w-full text-sm" value={addVariantForm.breadth} onChange={e => setAddVariantForm(f => ({ ...f, breadth: e.target.value }))} placeholder="0.00" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Height (cm)</label>
                  <input type="number" step="0.01" min="0" className="border rounded px-3 py-2 w-full text-sm" value={addVariantForm.height} onChange={e => setAddVariantForm(f => ({ ...f, height: e.target.value }))} placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weight (g)</label>
                  <input type="number" step="0.001" min="0" className="border rounded px-3 py-2 w-full text-sm" value={addVariantForm.weight} onChange={e => setAddVariantForm(f => ({ ...f, weight: e.target.value }))} placeholder="0.000" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Images <span className="text-gray-400 font-normal">(optional)</span></label>
                <input
                  ref={addVariantImageInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="block w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border rounded px-2 py-1.5"
                  onChange={e => {
                    if (e.target.files && e.target.files.length > 0) {
                      const newFiles = Array.from(e.target.files);
                      setAddVariantImages(prev => {
                        // Avoid duplicates by name+size
                        const existing = new Set(prev.map(f => f.name + f.size));
                        const unique = newFiles.filter(f => !existing.has(f.name + f.size));
                        return [...prev, ...unique];
                      });
                    }
                    // Reset input so same file can be re-added if removed
                    e.target.value = "";
                  }}
                />
                {addVariantImages.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {addVariantImages.map((f, idx) => (
                      <span
                        key={f.name + f.size}
                        className={`flex items-center gap-1 text-xs border rounded px-2 py-0.5 ${
                          addVariantMainImageIndex === idx
                            ? "bg-yellow-50 border-yellow-400 text-yellow-800"
                            : "bg-gray-100 border-gray-200 text-gray-700"
                        }`}
                      >
                        <button
                          type="button"
                          title="Set as main image"
                          className={`mr-0.5 text-base leading-none ${
                            addVariantMainImageIndex === idx ? "text-yellow-500" : "text-gray-300 hover:text-yellow-400"
                          }`}
                          onClick={() => setAddVariantMainImageIndex(idx)}
                        >
                          ★
                        </button>
                        {f.name}
                        <button
                          type="button"
                          className="text-red-500 hover:text-red-700 font-bold ml-1"
                          onClick={() => {
                            setAddVariantImages(prev => {
                              const updated = prev.filter((_, i) => i !== idx);
                              setAddVariantMainImageIndex(mi =>
                                mi >= updated.length ? Math.max(0, updated.length - 1) : mi > idx ? mi - 1 : mi
                              );
                              return updated;
                            });
                          }}
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                {addVariantImages.length > 1 && (
                  <p className="text-xs text-gray-400 mt-1">★ Click the star on an image to set it as the main image.</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Video <span className="text-gray-400 font-normal">(optional — .mp4, .mov, .avi, .webm)</span></label>
                <input
                  ref={addVariantVideoInputRef}
                  type="file"
                  accept="video/mp4,video/quicktime,video/x-msvideo,video/webm"
                  className="block w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 border rounded px-2 py-1.5"
                  onChange={e => {
                    const file = e.target.files?.[0] ?? null;
                    setAddVariantVideo(file);
                  }}
                />
                {addVariantVideo && (
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-xs bg-purple-50 border border-purple-200 rounded px-2 py-0.5 text-purple-700">{addVariantVideo.name}</span>
                    <button
                      type="button"
                      className="text-red-500 hover:text-red-700 text-xs font-bold"
                      onClick={() => {
                        setAddVariantVideo(null);
                        if (addVariantVideoInputRef.current) addVariantVideoInputRef.current.value = "";
                      }}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" className="px-4 py-2 text-sm border rounded text-gray-600 hover:bg-gray-50" onClick={() => setAddVariantDialog(false)}>Cancel</button>
                <button type="submit" disabled={addVariantSubmitting} className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60">{addVariantSubmitting ? "Saving..." : "Add Variant"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inventory Dialog */}
      {inventoryDialog && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold">{inventoryId ? "Edit" : "Add"} Inventory — <span className="text-blue-700">{inventorySkuLabel}</span></h3>
              <button type="button" className="text-sm text-gray-500 hover:text-gray-700" onClick={() => setInventoryDialog(false)}>Close</button>
            </div>
            {inventoryLoading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!inventoryVariantId) { toast.error("Variant ID missing"); return; }
                if (!inventoryForm.qty || isNaN(Number(inventoryForm.qty)) || Number(inventoryForm.qty) < 0) {
                  toast.error("Please enter a valid quantity");
                  return;
                }
                if (!inventoryForm.whid.trim()) { toast.error("Warehouse ID is required"); return; }
                setInventorySubmitting(true);
                try {
                  let res: Response;
                  if (inventoryId) {
                    // Edit mode: PUT with totalQty, availableQty, whid
                    res = await fetch(`${API_BASE}/api/products/inventory/${inventoryId}`, {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        totalQty: Number(inventoryForm.qty),
                        availableQty: inventoryForm.availableQty !== "" ? Number(inventoryForm.availableQty) : undefined,
                        whid: inventoryForm.whid.trim(),
                      }),
                    });
                  } else {
                    // Add mode: POST
                    res = await fetch(`${API_BASE}/api/products/inventory`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        productVarId: inventoryVariantId,
                        qty: Number(inventoryForm.qty),
                        whid: inventoryForm.whid.trim(),
                      }),
                    });
                  }
                  let data: any = null;
                  try { data = await res.json(); } catch {}
                  if (!res.ok) throw new Error(data?.message || data?.error || `Server error: ${res.status}`);
                  toast.success(`Inventory ${inventoryId ? "updated" : "added"} successfully!`);
                  setInventoryDialog(false);
                } catch (err: any) {
                  toast.error(err.message || "Failed to update inventory");
                } finally {
                  setInventorySubmitting(false);
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity <span className="text-red-500">*</span></label>
                <input
                  required
                  type="number"
                  min="0"
                  className="border rounded px-3 py-2 w-full text-sm"
                  value={inventoryForm.qty}
                  onChange={e => setInventoryForm(f => ({ ...f, qty: e.target.value }))}
                  placeholder="e.g. 100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Available Qty</label>
                <input
                  type="number"
                  min="0"
                  className="border rounded px-3 py-2 w-full text-sm bg-gray-50"
                  value={inventoryForm.availableQty}
                  onChange={e => setInventoryForm(f => ({ ...f, availableQty: e.target.value }))}
                  placeholder="e.g. 75"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse ID <span className="text-red-500">*</span></label>
                <input
                  required
                  type="text"
                  className="border rounded px-3 py-2 w-full text-sm"
                  value={inventoryForm.whid}
                  onChange={e => setInventoryForm(f => ({ ...f, whid: e.target.value }))}
                  placeholder="e.g. wh1"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" className="px-4 py-2 text-sm border rounded text-gray-600 hover:bg-gray-50" onClick={() => setInventoryDialog(false)}>Cancel</button>
                <button type="submit" disabled={inventorySubmitting} className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-60">
                  {inventorySubmitting ? "Saving..." : inventoryId ? "Update Inventory" : "Add Inventory"}
                </button>
              </div>
            </form>
            )}
          </div>
        </div>
      )}

      {/* Attribute Sub-Dialog */}
      {attrDialog?.open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold">Attributes — <span className="text-blue-700">{attrDialog.skuCode}</span></h3>
              <button type="button" className="text-sm text-gray-500 hover:text-gray-700" onClick={() => setAttrDialog(null)}>Close</button>
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex justify-end">
                <button
                  type="button"
                  className="px-4 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold"
                  onClick={() => {
                    setAttrEditForm({ attributeName: '', attributeValue: '' });
                    setAttrEditDialog({ open: true, mode: 'add' });
                  }}
                >
                  + New Attribute
                </button>
              </div>
              {attrDialog.attributes.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">No attributes found for this variant.</div>
              ) : (
                <div className="overflow-x-auto rounded border">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-700">
                      <tr>
                        <th className="text-left px-3 py-2 font-semibold">Attribute Name</th>
                        <th className="text-left px-3 py-2 font-semibold">Attribute Value</th>
                        <th className="text-left px-3 py-2 font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attrDialog.attributes.map((a: any) => (
                        <tr key={a.id} className="border-t hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium text-gray-700">{a.attributeName}</td>
                          <td className="px-3 py-2 text-gray-600">{a.attributeValue}</td>
                          <td className="px-3 py-2 flex gap-2">
                            <button
                              type="button"
                              className="text-xs text-indigo-600 font-semibold hover:underline"
                              onClick={() => {
                                setAttrEditForm({ attributeName: a.attributeName, attributeValue: a.attributeValue });
                                setAttrEditDialog({ open: true, mode: 'edit', attribute: a });
                              }}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="text-xs text-red-500 font-semibold hover:underline"
                              onClick={() => setAttrDeleteDialog({ open: true, attribute: a })}
                            >
                              Delete
                            </button>
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
      )}

      {/* Attribute Add/Edit Dialog */}
      {attrEditDialog?.open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold">
                {attrEditDialog.mode === 'add' ? 'Add New Attribute' : 'Edit Attribute'}
              </h3>
              <button type="button" className="text-sm text-gray-500 hover:text-gray-700" onClick={() => setAttrEditDialog(null)}>Close</button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setAttrEditSubmitting(true);
                try {
                  let res;
                  if (attrEditDialog.mode === 'add') {
                    res = await fetch(`${API_BASE}/products/productAttributes`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        variantId: attrDialog!.variantId,
                        attributeName: attrEditForm.attributeName,
                        attributeValue: attrEditForm.attributeValue,
                      }),
                    });
                  } else if (attrEditDialog.mode === 'edit' && attrEditDialog.attribute) {
                    res = await fetch(`${API_BASE}/products/productAttributes/${attrEditDialog.attribute.id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        variantId: attrDialog!.variantId,
                        attributeName: attrEditForm.attributeName,
                        attributeValue: attrEditForm.attributeValue,
                      }),
                    });
                  }
                  if (!res?.ok) throw new Error('Failed to save attribute');
                  const data = await res.json();
                  let newAttrs = attrDialog!.attributes.slice();
                  if (attrEditDialog.mode === 'add') {
                    newAttrs.push(data);
                  } else if (attrEditDialog.mode === 'edit' && attrEditDialog.attribute) {
                    newAttrs = newAttrs.map((a) => a.id === data.id ? data : a);
                  }
                  setAttrDialog(d => d ? { ...d, attributes: newAttrs } : d);
                  setAttrEditDialog(null);
                  toast.success('Attribute saved');
                } catch (err: any) {
                  toast.error(err.message || 'Failed to save attribute');
                } finally {
                  setAttrEditSubmitting(false);
                }
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Attribute Name</label>
                <input
                  required
                  className="border rounded px-3 py-2 w-full text-sm"
                  value={attrEditForm.attributeName}
                  onChange={e => setAttrEditForm(f => ({ ...f, attributeName: e.target.value }))}
                  placeholder="e.g. Flavour"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Attribute Value</label>
                <input
                  required
                  className="border rounded px-3 py-2 w-full text-sm"
                  value={attrEditForm.attributeValue}
                  onChange={e => setAttrEditForm(f => ({ ...f, attributeValue: e.target.value }))}
                  placeholder="e.g. Dark Chocolate"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" className="px-4 py-2 text-sm border rounded text-gray-600 hover:bg-gray-50" onClick={() => setAttrEditDialog(null)} disabled={attrEditSubmitting}>Cancel</button>
                <button type="submit" disabled={attrEditSubmitting} className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60">
                  {attrEditSubmitting ? 'Saving...' : (attrEditDialog.mode === 'add' ? 'Add Attribute' : 'Update Attribute')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attribute Delete Dialog */}
      {attrDeleteDialog?.open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded shadow-xl w-full max-w-sm p-6">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-gray-900">Delete Attribute</h3>
              <p className="text-sm text-gray-500">
                Are you sure you want to delete attribute <span className="font-semibold text-gray-800">&ldquo;{attrDeleteDialog.attribute.attributeName}&rdquo;</span>?
              </p>
            </div>
            <div className="flex justify-center gap-3 mt-6">
              <button
                type="button"
                className="px-6 py-2 text-sm rounded border text-gray-700 hover:bg-gray-50 font-medium"
                onClick={() => setAttrDeleteDialog(null)}
                disabled={attrDeleteSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-6 py-2 text-sm rounded bg-red-600 text-white hover:bg-red-700 font-semibold disabled:opacity-60"
                disabled={attrDeleteSubmitting}
                onClick={async () => {
                  setAttrDeleteSubmitting(true);
                  try {
                    const res = await fetch(`${API_BASE}/products/productAttributes/${attrDeleteDialog.attribute.id}`, { method: 'DELETE' });
                    if (!res.ok && res.status !== 204) throw new Error(`Server error: ${res.status}`);
                    setAttrDialog(d => d ? { ...d, attributes: d.attributes.filter(a => a.id !== attrDeleteDialog.attribute.id) } : d);
                    setAttrDeleteDialog(null);
                    toast.success('Attribute deleted');
                  } catch (err: any) {
                    toast.error(err.message || 'Failed to delete attribute');
                  } finally {
                    setAttrDeleteSubmitting(false);
                  }
                }}
              >
                {attrDeleteSubmitting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Variant Confirmation Popup */}
      {deleteVariantConfirm?.open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded shadow-xl w-full max-w-sm p-6">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-gray-900">Delete Variant</h3>
              <p className="text-sm text-gray-500">
                Are you sure you want to delete variant <span className="font-semibold text-gray-800">&ldquo;{deleteVariantConfirm.skuCode}&rdquo;</span>? This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-center gap-3 mt-6">
              <button
                type="button"
                className="px-6 py-2 text-sm rounded border text-gray-700 hover:bg-gray-50 font-medium"
                onClick={() => setDeleteVariantConfirm(null)}
                disabled={deleteVariantLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-6 py-2 text-sm rounded bg-red-600 text-white hover:bg-red-700 font-semibold disabled:opacity-60"
                disabled={deleteVariantLoading}
                onClick={async () => {
                  if (!deleteVariantConfirm) return;
                  setDeleteVariantLoading(true);
                  try {
                    const res = await fetch(`${API_BASE}/products/productsVariant/${deleteVariantConfirm.variantId}`, { method: "DELETE" });
                    if (!res.ok && res.status !== 204) throw new Error(`Server error: ${res.status}`);
                    toast.success("Variant deleted successfully!");
                    setDeleteVariantConfirm(null);
                    if (variantProductId) {
                      setVariantLoading(true);
                      const vRes = await fetch(`${API_BASE}/products/productsVariant/${variantProductId}`);
                      const vData = await vRes.json();
                      setVariants(Array.isArray(vData) ? vData : vData.variants || []);
                      setVariantLoading(false);
                    }
                  } catch (err: any) {
                    toast.error(err.message || "Failed to delete variant");
                  } finally {
                    setDeleteVariantLoading(false);
                  }
                }}
              >
                {deleteVariantLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Popup */}
      {deleteConfirm?.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded shadow-xl w-full max-w-sm p-6">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-gray-900">Delete Product</h3>
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

export default DashboardProductTable;
