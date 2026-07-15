"use client";
import React, { useState, useCallback, useEffect } from "react";
import { showToast, showError } from "@/lib/toast";
import { DashboardSidebar } from "@/components";
import { API_BASE } from "@/lib/env";

const API = `${API_BASE}/api/inventory`;

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: "bg-green-100 text-green-700",
  RESERVED:  "bg-blue-100 text-blue-700",
  SOLD:      "bg-gray-100 text-gray-600",
  DAMAGED:   "bg-orange-100 text-orange-700",
  EXPIRED:   "bg-red-100 text-red-700",
  I:         "bg-red-100 text-red-600",
};

// â”€â”€ types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface Warehouse {
  warehouseId: number;
  warehouseName: string;
  warehouseCode: string;
}
interface Product {
  id: number;
  title: string;
}
interface ProductVariant {
  variantId: number;
  skuCode: string;
  packSize?: string;
}
interface InventoryItem {
  id: number;
  barcode: string;
  batchNo: string;
  status: string;
  mfd?: string;
  bestBefore?: string;
  expiryDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface InventoryRecord {
  inventoryId: number;
  productVarId: number;
  productVariantName: string;
  warehouseId: number;
  warehouseCode: string;
  warehouseName: string;
  totalQty: number;
  availableQty: number;
  reservedQty: number;
  quantityReserved: number;
  reorderLevel: number;
  safetyStock: number;
  status: string;
  items: InventoryItem[];
}

// â”€â”€ component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const InventoryPage = () => {
  // â”€â”€ filter state
  const [filterProductId, setFilterProductId] = useState("");
  const [filterVariantId, setFilterVariantId] = useState("");
  const [filterVariants, setFilterVariants] = useState<ProductVariant[]>([]);
  const [filterWarehouseId, setFilterWarehouseId] = useState("");
  const [filterBarcode, setFilterBarcode] = useState("");

  // â”€â”€ load form product/variant cascade
  const [loadProductId, setLoadProductId] = useState("");
  const [loadVariants, setLoadVariants] = useState<ProductVariant[]>([]);
  const [loadWarehouseNumericId, setLoadWarehouseNumericId] = useState("");

  // â”€â”€ load form â€” existing stock preview
  const [loadStockPreview, setLoadStockPreview] = useState<InventoryRecord | null>(null);
  const [loadStockPreviewLoading, setLoadStockPreviewLoading] = useState(false);

  // â”€â”€ master data
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // â”€â”€ fetch master data on mount
  useEffect(() => {
    const t = setTimeout(() => {
      fetch(`${API_BASE}/api/Get-All-Warehouses`)
        .then(r => r.json())
        .then(data => setWarehouses(Array.isArray(data) ? data : []))
        .catch(() => {});
      fetch(`${API_BASE}/products/product`)
        .then(r => r.json())
        .then(data => setProducts(Array.isArray(data) ? data : []))
        .catch(() => {});
    }, 0);
    return () => clearTimeout(t);
  }, []);

  // â”€â”€ fetch variants for a product
  const fetchVariantsFor = useCallback(async (
    productId: string,
    target: "filter" | "load",
  ) => {
    if (!productId) {
      target === "filter" ? setFilterVariants([]) : setLoadVariants([]);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/products/productsVariant/${productId}`);
      const data = await res.json();
      const list: ProductVariant[] = Array.isArray(data) ? data : [];
      target === "filter" ? setFilterVariants(list) : setLoadVariants(list);
    } catch {
      target === "filter" ? setFilterVariants([]) : setLoadVariants([]);
    }
  }, []);

  // â”€â”€ list state
  const [records, setRecords] = useState<InventoryRecord[]>([]);
  const [fetching, setFetching] = useState(false);
  const [expandedRecordId, setExpandedRecordId] = useState<number | null>(null);
  const [refreshingCounts, setRefreshingCounts] = useState(false);

  // â”€â”€ load form
  const [loadForm, setLoadForm] = useState({
    productVarId: "", qty: "", whid: "",
    mfd: "", bestBeforeDays: "", expiryDate: "",
  });
  const [loadSubmitting, setLoadSubmitting] = useState(false);
  const [loadResult, setLoadResult] = useState<any>(null);

  // â”€â”€ remove / restore
  const [removeBarcode, setRemoveBarcode] = useState("");
  const [restoreBarcode, setRestoreBarcode] = useState("");
  const [removeSubmitting, setRemoveSubmitting] = useState(false);
  const [restoreSubmitting, setRestoreSubmitting] = useState(false);

  // â”€â”€ active tab
  const [tab, setTab] = useState<"list" | "load" | "remove" | "restore" | "labels" | "labelhistory">("list");

  // â”€â”€ label print
  const [labelMode, setLabelMode] = useState<"batch" | "barcodes">("batch");
  const [labelBrandName, setLabelBrandName] = useState("");
  const [labelBatchNo, setLabelBatchNo] = useState("");
  const [labelBarcodes, setLabelBarcodes] = useState("");
  const [labelSubmitting, setLabelSubmitting] = useState(false);
  const [labelResult, setLabelResult] = useState<{ status: string; message: string; pdfUrl: string | null; labelCount: number } | null>(null);
  const [labelConfigs, setLabelConfigs] = useState<{ id: number; configName: string; labelWidthInches: number; labelHeightInches: number; isDefault: boolean }[]>([]);
  const [labelConfigId, setLabelConfigId] = useState<string>("");

  // â”€â”€ fetch label configs when labels tab opens
  useEffect(() => {
    if (tab !== "labels") return;
    fetch(`${API_BASE}/products/labels/config`)
      .then(r => r.json())
      .then(data => {
        const active = (Array.isArray(data) ? data : []).filter((c: any) => c.status === "ACTIVE");
        setLabelConfigs(active);
        const def = active.find((c: any) => c.isDefault);
        if (def) setLabelConfigId(String(def.id));
      })
      .catch(() => {});
  }, [tab]);

  // â”€â”€ label history
  const [labelJobs, setLabelJobs] = useState<any[]>([]);
  const [labelJobsLoading, setLabelJobsLoading] = useState(false);
  const [labelJobsPage, setLabelJobsPage] = useState(1);
  const [labelJobsHasMore, setLabelJobsHasMore] = useState(false);
  const [labelJobsFilter, setLabelJobsFilter] = useState({ batchNo: "", barcode: "" });
  const [reprinting, setReprinting] = useState<number | null>(null);

  // â”€â”€ fetch label job history â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const fetchLabelJobs = useCallback(async (
    page: number,
    filter: { batchNo: string; barcode: string },
  ) => {
    setLabelJobsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (filter.batchNo.trim()) params.set("batchNo", filter.batchNo.trim());
      else if (filter.barcode.trim()) params.set("barcode", filter.barcode.trim());
      const res = await fetch(`${API_BASE}/products/labels/jobs?${params}`);
      const data = await res.json();
      const jobs = Array.isArray(data) ? data : [];
      setLabelJobs(jobs);
      setLabelJobsHasMore(jobs.length === 20);
    } catch { setLabelJobs([]); }
    finally { setLabelJobsLoading(false); }
  }, []);

  // â”€â”€ fetch existing stock preview for load form â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const fetchLoadStockPreview = useCallback(async (variantId: string, warehouseId: string) => {
    if (!variantId || !warehouseId) { setLoadStockPreview(null); return; }
    setLoadStockPreviewLoading(true);
    setLoadStockPreview(null);
    try {
      const res = await fetch(`${API}/details?productVarId=${variantId}&warehouseId=${warehouseId}`);
      const data = await res.json();
      const rec = (data.inventories || [])[0] || null;
      setLoadStockPreview(rec);
    } catch { setLoadStockPreview(null); }
    finally { setLoadStockPreviewLoading(false); }
  }, []);

  // â”€â”€ fetch inventory list â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const fetchInventory = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterBarcode.trim()) {
      params.set("barcode", filterBarcode.trim());
    } else {
      if (filterVariantId.trim()) params.set("productVarId", filterVariantId.trim());
      if (filterWarehouseId.trim()) params.set("warehouseId", filterWarehouseId.trim());
    }
    if (!params.toString()) {
      showError("Please enter at least one filter (Variant ID, Warehouse ID, or Barcode).");
      return;
    }
    setFetching(true);
    setRecords([]);
    try {
      const res = await fetch(`${API}/details?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.responseMessage || "Failed to fetch inventory");
      setRecords(data.inventories || []);
      if ((data.inventories || []).length === 0) showToast("No inventory records found.");
    } catch (err: any) {
      showError(err.message || "Error fetching inventory");
    } finally {
      setFetching(false);
    }
  }, [filterVariantId, filterWarehouseId, filterBarcode]);

  // â”€â”€ load inventory â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleRefreshCounts = async () => {
    setRefreshingCounts(true);
    try {
      const body: any = {};
      if (filterVariantId.trim()) body.productVarId = Number(filterVariantId.trim());
      else if (filterWarehouseId.trim()) body.warehouseId = Number(filterWarehouseId.trim());
      body.refreshedBy = "admin";
      const res = await fetch(`${API}/refresh-counts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || data.status === "FAILURE") throw new Error(data.message || "Refresh failed");
      showToast(data.message || `Refreshed ${data.refreshedCount ?? 0} record(s)`);
      if (records.length > 0) await fetchInventory();
    } catch (err: any) {
      showError(err.message || "Error refreshing inventory counts");
    } finally {
      setRefreshingCounts(false);
    }
  };

  // â”€â”€ load inventory â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleLoad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loadForm.productVarId || !loadForm.qty || !loadForm.whid) {
      showError("Product Variant ID, Qty, and Warehouse are required.");
      return;
    }

    // Compute bestBefore date from mfd + bestBeforeDays
    let computedBestBefore = "";
    if (loadForm.mfd && loadForm.bestBeforeDays) {
      const days = Number(loadForm.bestBeforeDays);
      if (isNaN(days) || days <= 0) {
        showError("Best Before Days must be a positive number.");
        return;
      }
      const mfdDate = new Date(loadForm.mfd);
      mfdDate.setDate(mfdDate.getDate() + days);
      computedBestBefore = mfdDate.toISOString().split("T")[0];
    } else if (loadForm.bestBeforeDays && !loadForm.mfd) {
      showError("Manufactured Date is required to calculate Best Before date.");
      return;
    }

    // Expiry must be after best-before
    if (computedBestBefore && loadForm.expiryDate) {
      if (loadForm.expiryDate <= computedBestBefore) {
        showError("Expiry Date must be after Best Before date (" + computedBestBefore + ").");
        return;
      }
    }

    setLoadSubmitting(true);
    setLoadResult(null);
    try {
      const body: any = {
        productVarId: Number(loadForm.productVarId),
        qty: Number(loadForm.qty),
        whid: loadForm.whid.trim(),
      };
      if (loadForm.mfd) body.mfd = loadForm.mfd;
      if (computedBestBefore) body.bestBefore = computedBestBefore;
      if (loadForm.expiryDate) body.expiryDate = loadForm.expiryDate;

      const res = await fetch(`${API}/load`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || data.responseStatus === "FAILURE") throw new Error(data.responseMessage || "Load failed");
      setLoadResult(data);
      showToast(data.responseMessage || "Inventory loaded successfully.");
      setLoadForm({ productVarId: "", qty: "", whid: "", mfd: "", bestBeforeDays: "", expiryDate: "" });
      setLoadProductId("");
      setLoadVariants([]);
      setLoadWarehouseNumericId("");
      setLoadStockPreview(null);
    } catch (err: any) {
      showError(err.message || "Error loading inventory");
    } finally {
      setLoadSubmitting(false);
    }
  };

  // â”€â”€ remove inventory â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleRemove = async (barcode: string) => {
    const bc = barcode.trim();
    if (!bc) { showError("Barcode is required."); return; }
    setRemoveSubmitting(true);
    try {
      const res = await fetch(`${API}/remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode: bc }),
      });
      const data = await res.json();
      if (!res.ok || data.responseStatus === "FAILURE") throw new Error(data.responseMessage || "Remove failed");
      showToast(data.responseMessage || "Item removed.");
      setRemoveBarcode("");
      // refresh list if visible
      if (records.length > 0) fetchInventory();
    } catch (err: any) {
      showError(err.message || "Error removing item");
    } finally {
      setRemoveSubmitting(false);
    }
  };

  // â”€â”€ restore inventory â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleRestore = async (barcode: string) => {
    const bc = barcode.trim();
    if (!bc) { showError("Barcode is required."); return; }
    setRestoreSubmitting(true);
    try {
      const res = await fetch(`${API}/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode: bc }),
      });
      const data = await res.json();
      if (!res.ok || data.responseStatus === "FAILURE") throw new Error(data.responseMessage || "Restore failed");
      showToast(data.responseMessage || "Item restored.");
      setRestoreBarcode("");
      if (records.length > 0) fetchInventory();
    } catch (err: any) {
      showError(err.message || "Error restoring item");
    } finally {
      setRestoreSubmitting(false);
    }
  };

  // â”€â”€ render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <div className="bg-white flex flex-col min-h-screen max-w-screen-2xl mx-auto">
      <DashboardSidebar />
      <div className="flex-1 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Inventory Management</h1>

        {/* Tab bar */}
        <div className="flex gap-1 mb-6 border-b border-gray-200">
          {([  
            { key: "list",         label: "View Inventory" },
            { key: "load",         label: "Load Stock" },
            { key: "remove",       label: "Remove Item" },
            { key: "restore",      label: "Restore Item" },
            { key: "labels",       label: "Print Labels" },
            { key: "labelhistory", label: "Label History" },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === key
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* â”€â”€ VIEW INVENTORY TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {tab === "list" && (
          <div className="space-y-5">
            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Filter Inventory</h2>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Product</label>
                  <select
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                    value={filterProductId}
                    onChange={e => {
                      setFilterProductId(e.target.value);
                      setFilterVariantId("");
                      fetchVariantsFor(e.target.value, "filter");
                    }}
                  >
                    <option value="">â€” Select Product â€”</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Product Variant</label>
                  <select
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white disabled:bg-gray-50"
                    value={filterVariantId}
                    disabled={!filterProductId}
                    onChange={e => setFilterVariantId(e.target.value)}
                  >
                    <option value="">â€” Select Variant â€”</option>
                    {filterVariants.map(v => (
                      <option key={v.variantId} value={v.variantId}>
                        {v.skuCode}{v.packSize ? ` (${v.packSize})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Warehouse</label>
                  <select
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                    value={filterWarehouseId}
                    onChange={e => setFilterWarehouseId(e.target.value)}
                  >
                    <option value="">â€” Select Warehouse â€”</option>
                    {warehouses.map(w => (
                      <option key={w.warehouseId} value={w.warehouseId}>
                        {w.warehouseName} ({w.warehouseCode})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Barcode</label>
                  <input
                    type="text"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    placeholder="e.g. BC-101-..."
                    value={filterBarcode}
                    onChange={e => setFilterBarcode(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && fetchInventory()}
                  />
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={fetchInventory}
                  disabled={fetching}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-60 font-medium"
                >
                  {fetching ? "Searching…" : "Search"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFilterProductId("");
                    setFilterVariantId("");
                    setFilterVariants([]);
                    setFilterWarehouseId("");
                    setFilterBarcode("");
                    setRecords([]);
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 font-medium"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={handleRefreshCounts}
                  disabled={refreshingCounts || fetching}
                  className="px-4 py-2 bg-amber-500 text-white text-sm rounded-lg hover:bg-amber-600 disabled:opacity-60 font-medium ml-auto"
                  title="Recalculates totalQty and availableQty from actual inventory_details rows"
                >
                  {refreshingCounts ? "Refreshing…" : "↻ Refresh Inv Count"}
                </button>
              </div>
            </div>

            {/* Results */}
            {records.length > 0 && (
              <div className="space-y-4">
                {records.map(rec => (
                  <div key={rec.inventoryId} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                    {/* Summary row */}
                    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-gray-50 border-b border-gray-100">
                      <div className="flex flex-wrap gap-4 text-xs text-gray-600">
                        <span><span className="font-semibold text-gray-800">Product:</span> {rec.productVariantName || `Variant #${rec.productVarId}`}</span>
                        <span><span className="font-semibold text-gray-800">Warehouse:</span> {rec.warehouseName || rec.warehouseCode || `#${rec.warehouseId}`}</span>
                        <span><span className="font-semibold text-gray-800">Total Qty:</span> {rec.totalQty}</span>
                        <span className="text-green-700 font-semibold">Available: {rec.availableQty}</span>
                        <span><span className="font-semibold text-gray-800">Reserved:</span> {rec.quantityReserved ?? rec.reservedQty ?? 0}</span>
                        {rec.reorderLevel > 0 && <span className={`${rec.availableQty <= rec.reorderLevel ? "text-red-600 font-bold" : "text-gray-600"}`}>Reorder Level: {rec.reorderLevel}</span>}
                      </div>
                      <button
                        type="button"
                        className="text-xs font-medium text-blue-600 hover:underline"
                        onClick={() => setExpandedRecordId(expandedRecordId === rec.inventoryId ? null : rec.inventoryId)}
                      >
                        {expandedRecordId === rec.inventoryId ? "Hide Items â–²" : `Show Items (${rec.items?.length ?? 0}) â–¼`}
                      </button>
                    </div>

                    {/* Items table */}
                    {expandedRecordId === rec.inventoryId && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                              <th className="text-left px-4 py-2 font-semibold text-gray-600">Barcode</th>
                              <th className="text-left px-4 py-2 font-semibold text-gray-600">Batch No</th>
                              <th className="text-left px-4 py-2 font-semibold text-gray-600">Status</th>
                              <th className="text-left px-4 py-2 font-semibold text-gray-600">MFD</th>
                              <th className="text-left px-4 py-2 font-semibold text-gray-600">Best Before</th>
                              <th className="text-left px-4 py-2 font-semibold text-gray-600">Expiry</th>
                              <th className="text-left px-4 py-2 font-semibold text-gray-600">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {(rec.items || []).map(item => (
                              <tr key={item.id} className="hover:bg-gray-50">
                                <td className="px-4 py-2 font-mono text-gray-700">{item.barcode}</td>
                                <td className="px-4 py-2 font-mono text-gray-500">{item.batchNo}</td>
                                <td className="px-4 py-2">
                                  <span className={`px-2 py-0.5 rounded-full font-semibold text-xs ${STATUS_COLORS[item.status] || "bg-gray-100 text-gray-600"}`}>
                                    {item.status}
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-gray-600">{item.mfd || "â€”"}</td>
                                <td className="px-4 py-2 text-gray-600">{item.bestBefore || "â€”"}</td>
                                <td className="px-4 py-2 text-gray-600">{item.expiryDate || "â€”"}</td>
                                <td className="px-4 py-2 flex gap-2">
                                  {item.status !== "I" && (
                                    <button
                                      type="button"
                                      className="text-red-500 hover:underline font-medium"
                                      onClick={() => handleRemove(item.barcode)}
                                    >
                                      Remove
                                    </button>
                                  )}
                                  {(item.status === "I" || item.status === "SOLD" || item.status === "DAMAGED") && (
                                    <button
                                      type="button"
                                      className="text-green-600 hover:underline font-medium"
                                      onClick={() => handleRestore(item.barcode)}
                                    >
                                      Restore
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                            {(rec.items || []).length === 0 && (
                              <tr><td colSpan={7} className="px-4 py-4 text-center text-gray-400">No item details available.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* â”€â”€ LOAD STOCK TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {tab === "load" && (
          <div className="bg-white rounded-xl shadow-sm p-6 max-w-lg">
            <h2 className="text-base font-semibold text-gray-800 border-b pb-3 mb-5">Load Inventory Stock</h2>
            <form onSubmit={handleLoad} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Product <span className="text-red-500">*</span></label>
                  <select required
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                    value={loadProductId}
                    onChange={e => {
                      setLoadProductId(e.target.value);
                      setLoadForm(f => ({ ...f, productVarId: "" }));
                      setLoadStockPreview(null);
                      fetchVariantsFor(e.target.value, "load");
                    }}
                  >
                    <option value="">â€” Select Product â€”</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Product Variant <span className="text-red-500">*</span></label>
                  <select required
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white disabled:bg-gray-50"
                    value={loadForm.productVarId}
                    disabled={!loadProductId}
                    onChange={e => {
                      const vid = e.target.value;
                      setLoadForm(f => ({ ...f, productVarId: vid }));
                      fetchLoadStockPreview(vid, loadWarehouseNumericId);
                    }}
                  >
                    <option value="">â€” Select Variant â€”</option>
                    {loadVariants.map(v => (
                      <option key={v.variantId} value={v.variantId}>
                        {v.skuCode}{v.packSize ? ` (${v.packSize})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Warehouse <span className="text-red-500">*</span></label>
                  <select required
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                    value={loadForm.whid}
                    onChange={e => {
                      const selected = warehouses.find(w => w.warehouseCode === e.target.value);
                      const numId = selected ? String(selected.warehouseId) : "";
                      setLoadWarehouseNumericId(numId);
                      setLoadForm(f => ({ ...f, whid: e.target.value }));
                      fetchLoadStockPreview(loadForm.productVarId, numId);
                    }}
                  >
                    <option value="">â€” Select Warehouse â€”</option>
                    {warehouses.map(w => (
                      <option key={w.warehouseId} value={w.warehouseCode}>
                        {w.warehouseName} ({w.warehouseCode})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Quantity <span className="text-red-500">*</span></label>
                  <input type="number" required min={1}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    placeholder="e.g. 50"
                    value={loadForm.qty}
                    onChange={e => setLoadForm(f => ({ ...f, qty: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Manufactured Date</label>
                  <input type="date"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    value={loadForm.mfd}
                    onChange={e => setLoadForm(f => ({ ...f, mfd: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Best Before <span className="text-gray-400 font-normal">(days from MFD)</span>
                  </label>
                  <input type="number" min={1}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    placeholder="e.g. 180"
                    value={loadForm.bestBeforeDays}
                    onChange={e => setLoadForm(f => ({ ...f, bestBeforeDays: e.target.value }))} />
                  {loadForm.mfd && loadForm.bestBeforeDays && Number(loadForm.bestBeforeDays) > 0 && (() => {
                    const d = new Date(loadForm.mfd);
                    d.setDate(d.getDate() + Number(loadForm.bestBeforeDays));
                    return (
                      <p className="mt-1 text-xs text-blue-600">
                        Best before: <span className="font-semibold">{d.toLocaleDateString()}</span>
                      </p>
                    );
                  })()}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Expiry Date</label>
                  <input type="date"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    value={loadForm.expiryDate}
                    onChange={e => setLoadForm(f => ({ ...f, expiryDate: e.target.value }))} />
                  {loadForm.mfd && loadForm.bestBeforeDays && Number(loadForm.bestBeforeDays) > 0 && loadForm.expiryDate && (() => {
                    const d = new Date(loadForm.mfd);
                    d.setDate(d.getDate() + Number(loadForm.bestBeforeDays));
                    const bestBefore = d.toISOString().split("T")[0];
                    const invalid = loadForm.expiryDate <= bestBefore;
                    return invalid ? (
                      <p className="mt-1 text-xs text-red-500">Must be after {d.toLocaleDateString()}</p>
                    ) : null;
                  })()}
                </div>
              </div>
              {/* â”€â”€ Existing stock preview â”€â”€ */}
              {(loadStockPreviewLoading || loadStockPreview) && (
                <div className={`rounded-lg border p-4 text-sm ${
                  loadStockPreview ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-200"
                }`}>
                  {loadStockPreviewLoading ? (
                    <p className="text-xs text-gray-400">Loading existing stock…</p>
                  ) : loadStockPreview ? (
                    <>
                      <p className="text-xs font-semibold text-blue-700 mb-2">Current Stock in Selected Warehouse</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-white rounded-lg border border-blue-100 px-3 py-2 text-center">
                          <p className="text-xs text-gray-500">Total Qty</p>
                          <p className="text-lg font-bold text-gray-800">{loadStockPreview.totalQty}</p>
                        </div>
                        <div className="bg-white rounded-lg border border-green-100 px-3 py-2 text-center">
                          <p className="text-xs text-gray-500">Available</p>
                          <p className="text-lg font-bold text-green-700">{loadStockPreview.availableQty}</p>
                        </div>
                        <div className="bg-white rounded-lg border border-blue-100 px-3 py-2 text-center">
                          <p className="text-xs text-gray-500">Reserved</p>
                          <p className="text-lg font-bold text-blue-700">{loadStockPreview.quantityReserved ?? loadStockPreview.reservedQty ?? 0}</p>
                        </div>
                        <div className={`bg-white rounded-lg border px-3 py-2 text-center ${
                          loadStockPreview.reorderLevel > 0 && loadStockPreview.availableQty <= loadStockPreview.reorderLevel
                            ? "border-red-200" : "border-gray-100"
                        }`}>
                          <p className="text-xs text-gray-500">Reorder Level</p>
                          <p className={`text-lg font-bold ${
                            loadStockPreview.reorderLevel > 0 && loadStockPreview.availableQty <= loadStockPreview.reorderLevel
                              ? "text-red-600" : "text-gray-800"
                          }`}>{loadStockPreview.reorderLevel || "â€”"}</p>
                        </div>
                      </div>
                      {loadStockPreview.reorderLevel > 0 && loadStockPreview.availableQty <= loadStockPreview.reorderLevel && (
                        <p className="mt-2 text-xs text-red-600 font-semibold">âš  Available stock is at or below reorder level</p>
                      )}
                      <p className="mt-2 text-xs text-gray-400">Inventory ID: {loadStockPreview.inventoryId} &middot; Status: {loadStockPreview.status}</p>
                    </>
                  ) : null}
                </div>
              )}

              <button type="submit" disabled={loadSubmitting}
                className="w-full py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 font-medium disabled:opacity-60">
                {loadSubmitting ? "Loading…" : "Load Inventory"}
              </button>
            </form>

            {/* Result */}
            {loadResult && (
              <div className="mt-5 bg-green-50 border border-green-200 rounded-lg p-4 text-sm space-y-1">
                <p className="font-semibold text-green-700">{loadResult.responseMessage}</p>
                <p><span className="text-gray-500">Batch No:</span> <span className="font-mono">{loadResult.batchNo}</span></p>
                <p><span className="text-gray-500">Qty Loaded:</span> {loadResult.quantityLoaded}</p>
                <p><span className="text-gray-500">Total Available:</span> {loadResult.totalAvailableQty}</p>
                {loadResult.barcodes?.length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-blue-600 hover:underline">
                      View {loadResult.barcodes.length} generated barcodes
                    </summary>
                    <div className="mt-2 max-h-40 overflow-y-auto bg-white border rounded p-2 font-mono text-xs text-gray-700 space-y-0.5">
                      {loadResult.barcodes.map((bc: string) => <div key={bc}>{bc}</div>)}
                    </div>
                  </details>
                )}
              </div>
            )}
          </div>
        )}

        {/* â”€â”€ REMOVE ITEM TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {tab === "remove" && (
          <div className="bg-white rounded-xl shadow-sm p-6 max-w-md">
            <h2 className="text-base font-semibold text-gray-800 border-b pb-3 mb-5">Remove Inventory Item</h2>
            <p className="text-xs text-gray-500 mb-4">Mark a single unit as Inactive by its barcode. This decrements the available quantity.</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Barcode <span className="text-red-500">*</span></label>
                <input type="text"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder="e.g. BC-101-1718099234567-5"
                  value={removeBarcode}
                  onChange={e => setRemoveBarcode(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleRemove(removeBarcode)}
                />
              </div>
              <button
                type="button"
                disabled={removeSubmitting || !removeBarcode.trim()}
                onClick={() => handleRemove(removeBarcode)}
                className="w-full py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 font-medium disabled:opacity-60"
              >
                {removeSubmitting ? "Removing…" : "Remove Item"}
              </button>
            </div>
          </div>
        )}

        {/* â”€â”€ RESTORE ITEM TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {tab === "restore" && (
          <div className="bg-white rounded-xl shadow-sm p-6 max-w-md">
            <h2 className="text-base font-semibold text-gray-800 border-b pb-3 mb-5">Restore Inventory Item</h2>
            <p className="text-xs text-gray-500 mb-4">Restore a removed, sold, or damaged unit back to AVAILABLE status by its barcode.</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Barcode <span className="text-red-500">*</span></label>
                <input type="text"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder="e.g. BC-101-1718099234567-5"
                  value={restoreBarcode}
                  onChange={e => setRestoreBarcode(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleRestore(restoreBarcode)}
                />
              </div>
              <button
                type="button"
                disabled={restoreSubmitting || !restoreBarcode.trim()}
                onClick={() => handleRestore(restoreBarcode)}
                className="w-full py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 font-medium disabled:opacity-60"
              >
                {restoreSubmitting ? "Restoring…" : "Restore Item"}
              </button>
            </div>
          </div>
        )}

        {/* â”€â”€ PRINT LABELS TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {tab === "labels" && (
          <div className="bg-white rounded-xl shadow-sm p-6 max-w-lg">
            <h2 className="text-base font-semibold text-gray-800 border-b pb-3 mb-5">Print Inventory Labels</h2>
            <p className="text-xs text-gray-500 mb-5">Generates a thermal-printer-ready PDF with one label per page (CODE-128 barcode included).</p>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!labelBrandName.trim()) { showError("Brand Name is required."); return; }
                if (labelMode === "batch" && !labelBatchNo.trim()) { showError("Batch No is required."); return; }
                if (labelMode === "barcodes" && !labelBarcodes.trim()) { showError("At least one barcode is required."); return; }
                setLabelSubmitting(true);
                setLabelResult(null);
                try {
                  const body: Record<string, string | number> = { brandName: labelBrandName.trim() };
                  if (labelMode === "batch") body.batchNo = labelBatchNo.trim();
                  else body.barcodes = labelBarcodes.trim();
                  if (labelConfigId) body.labelConfigId = Number(labelConfigId);
                  const res = await fetch(`${API_BASE}/products/labels/print`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                  });
                  const data = await res.json();
                  setLabelResult(data);
                  if (data.status === "SUCCESS") showToast(data.message || "Labels generated");
                  else showError(data.message || "Failed to generate labels");
                } catch (err: any) {
                  showError(err.message || "Error generating labels");
                } finally {
                  setLabelSubmitting(false);
                }
              }}
              className="space-y-4"
            >
              {/* Label Configuration selector */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-gray-600">Label Configuration</label>
                  <button
                    type="button"
                    className="text-xs text-blue-500 hover:underline"
                    onClick={async () => {
                      try {
                        const r = await fetch(`${API_BASE}/products/labels/config`);
                        const d = await r.json();
                        const active = (Array.isArray(d) ? d : []).filter((c: any) => c.status === "ACTIVE");
                        setLabelConfigs(active);
                        const def = active.find((c: any) => c.isDefault);
                        if (def && !labelConfigId) setLabelConfigId(String(def.id));
                      } catch { showError("Failed to load configurations"); }
                    }}
                  >↻ Refresh</button>
                </div>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                  value={labelConfigId}
                  onChange={e => setLabelConfigId(e.target.value)}
                >
                  <option value="">â€” System default (auto) â€”</option>
                  {labelConfigs.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.configName} â€” {c.labelWidthInches}â€³ Ã— {c.labelHeightInches}â€³{c.isDefault ? " â˜… default" : ""}
                    </option>
                  ))}
                </select>
                {labelConfigs.length === 0 && (
                  <p className="text-xs text-gray-400 mt-1">Click ↻ Refresh to load saved configurations, or leave blank to use the system default.</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Brand Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder="e.g. FreshFarms"
                  value={labelBrandName}
                  onChange={e => setLabelBrandName(e.target.value)}
                />
              </div>

              {/* Mode toggle */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Label Source <span className="text-red-500">*</span></label>
                <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
                  <button
                    type="button"
                    onClick={() => { setLabelMode("batch"); setLabelResult(null); }}
                    className={`flex-1 py-2 font-medium transition-colors ${
                      labelMode === "batch" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >By Batch No</button>
                  <button
                    type="button"
                    onClick={() => { setLabelMode("barcodes"); setLabelResult(null); }}
                    className={`flex-1 py-2 font-medium transition-colors border-l border-gray-200 ${
                      labelMode === "barcodes" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >By Barcodes</button>
                </div>
              </div>

              {/* Batch No input */}
              {labelMode === "batch" && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Batch No <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    placeholder="e.g. BATCH-2026-06-A"
                    value={labelBatchNo}
                    onChange={e => setLabelBatchNo(e.target.value)}
                  />
                  <p className="text-xs text-gray-400 mt-1">Prints all inventory items belonging to this batch.</p>
                </div>
              )}

              {/* Barcodes input */}
              {labelMode === "barcodes" && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Barcodes <span className="text-red-500">*</span></label>
                  <textarea
                    rows={3}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 font-mono resize-none"
                    placeholder="BC001,BC002,BC003  (comma-separated)"
                    value={labelBarcodes}
                    onChange={e => setLabelBarcodes(e.target.value)}
                  />
                  <p className="text-xs text-gray-400 mt-1">Enter comma-separated barcode values.</p>
                </div>
              )}

              <button
                type="submit"
                disabled={labelSubmitting}
                className="w-full py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-60"
              >
                {labelSubmitting ? "Generating PDF…" : "Generate Label PDF"}
              </button>
            </form>

            {/* Result */}
            {labelResult && (
              <div className={`mt-5 rounded-lg border p-4 text-sm space-y-3 ${
                labelResult.status === "SUCCESS" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
              }`}>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    labelResult.status === "SUCCESS" ? "bg-green-600 text-white" : "bg-red-500 text-white"
                  }`}>{labelResult.status}</span>
                  <span className={`text-sm ${
                    labelResult.status === "SUCCESS" ? "text-green-800" : "text-red-700"
                  }`}>{labelResult.message}</span>
                </div>
                {labelResult.status === "SUCCESS" && labelResult.pdfUrl && (
                  <>
                    <p className="text-xs text-gray-600"><span className="font-semibold">{labelResult.labelCount}</span> label{labelResult.labelCount !== 1 ? "s" : ""} generated</p>
                    <div className="flex gap-2 flex-wrap">
                      <a
                        href={labelResult.pdfUrl?.startsWith('/') ? `${API_BASE}${labelResult.pdfUrl}` : labelResult.pdfUrl!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-4 py-2 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 font-medium"
                      >
                        ðŸ“„ Open PDF
                      </a>
                      <a
                        href={labelResult.pdfUrl?.startsWith('/') ? `${API_BASE}${labelResult.pdfUrl}` : labelResult.pdfUrl!}
                        download
                        className="inline-flex items-center gap-1 px-4 py-2 bg-gray-100 border border-gray-300 text-gray-700 text-xs rounded-lg hover:bg-gray-200 font-medium"
                      >
                        â¬‡ Download
                      </a>
                    </div>
                    <p className="text-xs text-gray-400 font-mono">{labelResult.pdfUrl}</p>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* â”€â”€ LABEL HISTORY TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {tab === "labelhistory" && (
          <div className="space-y-4">
            {/* Filter bar */}
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Label Print History</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Filter by Batch No</label>
                  <input
                    type="text"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    placeholder="e.g. BATCH-2026-06-A"
                    value={labelJobsFilter.batchNo}
                    onChange={e => setLabelJobsFilter(f => ({ batchNo: e.target.value, barcode: e.target.value ? "" : f.barcode }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Filter by Barcode</label>
                  <input
                    type="text"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    placeholder="e.g. BC001"
                    value={labelJobsFilter.barcode}
                    onChange={e => setLabelJobsFilter(f => ({ barcode: e.target.value, batchNo: e.target.value ? "" : f.batchNo }))}
                  />
                </div>
                <div className="flex items-end gap-2">
                  <button
                    type="button"
                    onClick={() => { setLabelJobsPage(1); fetchLabelJobs(1, labelJobsFilter); }}
                    disabled={labelJobsLoading}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-60 font-medium"
                  >
                    {labelJobsLoading ? "Loading…" : "Search"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const cleared = { batchNo: "", barcode: "" };
                      setLabelJobsFilter(cleared);
                      setLabelJobsPage(1);
                      fetchLabelJobs(1, cleared);
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 font-medium"
                  >All Jobs</button>
                </div>
              </div>
            </div>

            {/* Jobs table */}
            {labelJobsLoading ? (
              <p className="text-sm text-gray-400 px-1">Loading…</p>
            ) : labelJobs.length === 0 ? (
              <p className="text-sm text-gray-400 px-1">No label jobs found. Use Search to load history.</p>
            ) : (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Job ID</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Brand</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Batch / Barcodes</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Labels</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">PDF</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Printed At</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {labelJobs.map(job => (
                        <tr key={job.jobId} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono text-gray-700">#{job.jobId}</td>
                          <td className="px-4 py-3 text-gray-700">{job.brandName}</td>
                          <td className="px-4 py-3 text-gray-600 max-w-[180px]">
                            {job.batchNo
                              ? <span><span className="font-semibold text-gray-700">Batch:</span> {job.batchNo}</span>
                              : <span className="font-mono truncate block" title={job.barcodes || ""}>{job.barcodes || "â€”"}</span>
                            }
                          </td>
                          <td className="px-4 py-3 text-center font-semibold text-gray-700">{job.labelCount}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                              job.status === "SUCCESS" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                            }`}>{job.status}</span>
                          </td>
                          <td className="px-4 py-3">
                            {job.pdfFileExists
                              ? <span className="text-green-600 font-medium">&#10003; Exists</span>
                              : <span className="text-gray-400">Gone</span>
                            }
                          </td>
                          <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                            {job.printedAt ? new Date(job.printedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "â€”"}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2 flex-wrap">
                              {/* Download â€” only if PDF still exists */}
                              {job.pdfFileExists && job.pdfUrl && (
                                <a
                                  href={job.pdfUrl?.startsWith('/') ? `${API_BASE}${job.pdfUrl}` : job.pdfUrl}
                                  download
                                  className="px-2 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded text-xs font-medium hover:bg-indigo-100"
                                >
                                  â¬‡ Download
                                </a>
                              )}
                              {/* Open PDF in new tab */}
                              {job.pdfFileExists && job.pdfUrl && (
                                <a
                                  href={job.pdfUrl?.startsWith('/') ? `${API_BASE}${job.pdfUrl}` : job.pdfUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2 py-1 bg-gray-50 border border-gray-200 text-gray-700 rounded text-xs font-medium hover:bg-gray-100"
                                >
                                  ðŸ“„ Open
                                </a>
                              )}
                              {/* Reprint â€” regenerates PDF */}
                              <button
                                type="button"
                                disabled={reprinting === job.jobId}
                                className="px-2 py-1 bg-yellow-50 border border-yellow-300 text-yellow-800 rounded text-xs font-medium hover:bg-yellow-100 disabled:opacity-60"
                                onClick={async () => {
                                  setReprinting(job.jobId);
                                  try {
                                    const r = await fetch(
                                      `${API_BASE}/products/labels/jobs/${job.jobId}/reprint`,
                                      { method: "POST" },
                                    );
                                    const d = await r.json();
                                    if (d.status === "SUCCESS") {
                                      showToast(`Reprinted â€” ${d.labelCount} label${d.labelCount !== 1 ? "s" : ""}`);
                                      // Refresh list so new job appears
                                      fetchLabelJobs(labelJobsPage, labelJobsFilter);
                                    } else {
                                      showError(d.message || "Reprint failed");
                                    }
                                  } catch (err: any) {
                                    showError(err.message || "Reprint failed");
                                  } finally {
                                    setReprinting(null);
                                  }
                                }}
                              >
                                {reprinting === job.jobId ? "↻ Printing…" : "↻ Reprint"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
                  <span>Page {labelJobsPage}</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={labelJobsPage <= 1 || labelJobsLoading}
                      onClick={() => { const p = labelJobsPage - 1; setLabelJobsPage(p); fetchLabelJobs(p, labelJobsFilter); }}
                      className="px-3 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
                    >â† Prev</button>
                    <button
                      type="button"
                      disabled={!labelJobsHasMore || labelJobsLoading}
                      onClick={() => { const p = labelJobsPage + 1; setLabelJobsPage(p); fetchLabelJobs(p, labelJobsFilter); }}
                      className="px-3 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
                    >Next â†’</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default InventoryPage;
