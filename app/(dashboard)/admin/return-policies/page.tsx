"use client";

import { DashboardSidebar } from "@/components";
import React, { useEffect, useMemo, useState } from "react";
import { showToast, showError } from "@/lib/toast";
import { API_BASE_PLAIN } from "@/lib/env";

interface ReturnPolicy {
  id: number;
  name: string;
  description: string;
  returnWindowDays: number;
  isReturnable: boolean;
  refundType?: string | null;
  returnMethod?: string | null;
}

interface PolicyFormState {
  name: string;
  description: string;
  returnWindowDays: string;
  isReturnable: boolean;
}

interface ReturnPolicyCondition {
  id: number;
  policyId: number;
  conditionType: string;
  conditionValue: string;
}

interface ConditionFormState {
  conditionType: string;
  conditionValue: string;
}

interface ProductCategory {
  id: number;
  title: string;
  description?: string;
  href?: string;
  src?: string;
}

interface CategoryProduct {
  id: number;
  title: string;
  description?: string;
  price?: number;
  mrp?: number;
  currency?: string;
  sku?: string;
  inStock?: number;
  stock?: number;
}

interface MappedProduct {
  id: number;
  policyId: number;
  policyName?: string;
  entityType: string;
  entityId: number;
  priority?: number;
  productTitle?: string;
}

interface CategoryReturnPolicyEntry {
  categoryId: number;
  categoryName: string | null;
  returnPolicy: {
    policyId: number;
    name: string;
    description: string;
    returnWindowDays: number;
    isReturnable: boolean;
    refundType?: string | null;
    returnMethod?: string | null;
  } | null;
}

const emptyForm: PolicyFormState = {
  name: "",
  description: "",
  returnWindowDays: "0",
  isReturnable: true,
};

const emptyConditionForm: ConditionFormState = {
  conditionType: "",
  conditionValue: "",
};

const AdminReturnPoliciesPage = () => {
  const [policies, setPolicies] = useState<ReturnPolicy[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formDialog, setFormDialog] = useState<{
    open: boolean;
    mode: "add" | "edit";
    policyId: number | null;
  }>({
    open: false,
    mode: "add",
    policyId: null,
  });
  const [form, setForm] = useState<PolicyFormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [conditionsDialog, setConditionsDialog] = useState<{
    open: boolean;
    policy: ReturnPolicy | null;
  }>({ open: false, policy: null });
  const [conditions, setConditions] = useState<ReturnPolicyCondition[]>([]);
  const [conditionsLoading, setConditionsLoading] = useState(false);
  const [conditionsError, setConditionsError] = useState("");

  const [conditionFormDialog, setConditionFormDialog] = useState<{
    open: boolean;
    mode: "add" | "edit";
    conditionId: number | null;
  }>({
    open: false,
    mode: "add",
    conditionId: null,
  });
  const [conditionForm, setConditionForm] = useState<ConditionFormState>(emptyConditionForm);
  const [conditionSaving, setConditionSaving] = useState(false);

  const [mapProductsDialog, setMapProductsDialog] = useState<{
    open: boolean;
    policy: ReturnPolicy | null;
  }>({ open: false, policy: null });
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [categoryProducts, setCategoryProducts] = useState<CategoryProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [mappingLoading, setMappingLoading] = useState(false);
  const [mappedProducts, setMappedProducts] = useState<MappedProduct[]>([]);
  const [mappedProductsLoading, setMappedProductsLoading] = useState(false);
  const [unmappingId, setUnmappingId] = useState<number | null>(null);
  const [categoryPolicyInfo, setCategoryPolicyInfo] = useState<CategoryReturnPolicyEntry[]>([]);
  const [categoryPolicyLoading, setCategoryPolicyLoading] = useState(false);
  const [editMappingDialog, setEditMappingDialog] = useState<{
    open: boolean;
    mappingId: number | null;
    productTitle: string;
    policyId: string;
    priority: string;
  }>({ open: false, mappingId: null, productTitle: "", policyId: "", priority: "" });
  const [editMappingSaving, setEditMappingSaving] = useState(false);

  const baseUrl = API_BASE_PLAIN;

  const endpoint = `${baseUrl}/api/return-policies`;
  const conditionsEndpoint = `${baseUrl}/api/return-policy-conditions`;
  const policyMappingsEndpoint = `${baseUrl}/api/return-policy-mappings`;

  const fetchMappedProducts = async (policyId: number) => {
    try {
      setMappedProductsLoading(true);
      const res = await fetch(`${policyMappingsEndpoint}?policyId=${policyId}`, {
        headers: { accept: "*/*" },
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to fetch mapped products");
      const data = await res.json();
      setMappedProducts(Array.isArray(data) ? data : []);
    } catch {
      setMappedProducts([]);
    } finally {
      setMappedProductsLoading(false);
    }
  };

  const fetchProductCategories = async () => {
    try {
      setCategoriesLoading(true);
      const res = await fetch(`${baseUrl}/products/categories`, {
        method: "GET",
        headers: {
          accept: "*/*",
        },
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("Failed to fetch product categories");
      }

      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setCategories([]);
      showError(err?.message || "Failed to fetch product categories");
    } finally {
      setCategoriesLoading(false);
    }
  };

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(endpoint, {
        method: "GET",
        headers: {
          accept: "*/*",
        },
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("Failed to fetch return policies");
      }

      const data = await res.json();
      setPolicies(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message || "Failed to fetch return policies");
      showError(err?.message || "Failed to fetch return policies");
      setPolicies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => fetchPolicies(), 0);
    return () => clearTimeout(t);
  }, []);

  const openAddPolicy = () => {
    setForm(emptyForm);
    setFormDialog({ open: true, mode: "add", policyId: null });
  };

  const openEditPolicy = (policy: ReturnPolicy) => {
    setForm({
      name: policy.name || "",
      description: policy.description || "",
      returnWindowDays:
        policy.returnWindowDays === null || policy.returnWindowDays === undefined
          ? ""
          : String(policy.returnWindowDays),
      isReturnable: Boolean(policy.isReturnable),
    });

    setFormDialog({ open: true, mode: "edit", policyId: policy.id });
  };

  const closeDialog = () => {
    if (saving) return;
    setFormDialog({ open: false, mode: "add", policyId: null });
    setForm(emptyForm);
  };

  const handleSubmit = async () => {
    const trimmedName = form.name.trim();
    const trimmedDescription = form.description.trim();
    const days = Number(form.returnWindowDays);

    if (!trimmedName) {
      showError("Policy name is required");
      return;
    }

    if (!trimmedDescription) {
      showError("Policy description is required");
      return;
    }

    if (
      !form.returnWindowDays ||
      Number.isNaN(days) ||
      !Number.isFinite(days) ||
      days < 0
    ) {
      showError("Return window days must be a valid number");
      return;
    }

    const payload = {
      name: trimmedName,
      description: trimmedDescription,
      returnWindowDays: days,
      isReturnable: form.isReturnable,
    };

    try {
      setSaving(true);

      const isEdit = formDialog.mode === "edit" && formDialog.policyId !== null;
      const url = isEdit ? `${endpoint}/${formDialog.policyId}` : endpoint;

      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: {
          accept: "*/*",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || data?.responseStatus === "FAILURE") {
        throw new Error(
          data?.responseMessage ||
            (isEdit ? "Failed to update return policy" : "Failed to create return policy")
        );
      }

      showToast(
        data?.responseMessage ||
          (isEdit ? "Return policy updated successfully" : "Return policy created successfully")
      );

      closeDialog();
      await fetchPolicies();
    } catch (err: any) {
      showError(
        err?.message ||
          (formDialog.mode === "edit"
            ? "Failed to update return policy"
            : "Failed to create return policy")
      );
    } finally {
      setSaving(false);
    }
  };

  const fetchConditions = async (policyId: number) => {
    try {
      setConditionsLoading(true);
      setConditionsError("");

      const res = await fetch(`${conditionsEndpoint}?policyId=${policyId}`, {
        method: "GET",
        headers: {
          accept: "*/*",
        },
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("Failed to fetch policy conditions");
      }

      const data = await res.json();
      setConditions(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setConditionsError(err?.message || "Failed to fetch policy conditions");
      setConditions([]);
      showError(err?.message || "Failed to fetch policy conditions");
    } finally {
      setConditionsLoading(false);
    }
  };

  const openConditionsDialog = async (policy: ReturnPolicy) => {
    setConditionsDialog({ open: true, policy });
    setConditionFormDialog({ open: false, mode: "add", conditionId: null });
    setConditionForm(emptyConditionForm);
    await fetchConditions(policy.id);
  };

  const closeConditionsDialog = () => {
    if (conditionSaving) return;
    setConditionsDialog({ open: false, policy: null });
    setConditions([]);
    setConditionsError("");
    setConditionFormDialog({ open: false, mode: "add", conditionId: null });
    setConditionForm(emptyConditionForm);
  };

  const openAddCondition = () => {
    setConditionForm(emptyConditionForm);
    setConditionFormDialog({ open: true, mode: "add", conditionId: null });
  };

  const openEditCondition = (condition: ReturnPolicyCondition) => {
    setConditionForm({
      conditionType: condition.conditionType || "",
      conditionValue: condition.conditionValue || "",
    });
    setConditionFormDialog({ open: true, mode: "edit", conditionId: condition.id });
  };

  const closeConditionFormDialog = () => {
    if (conditionSaving) return;
    setConditionFormDialog({ open: false, mode: "add", conditionId: null });
    setConditionForm(emptyConditionForm);
  };

  const handleConditionSubmit = async () => {
    const selectedPolicyId = conditionsDialog.policy?.id;
    if (!selectedPolicyId) {
      showError("Policy id is not available");
      return;
    }

    const conditionType = conditionForm.conditionType.trim();
    const conditionValue = conditionForm.conditionValue.trim();

    if (!conditionType) {
      showError("Condition type is required");
      return;
    }

    if (!conditionValue) {
      showError("Condition value is required");
      return;
    }

    const payload = {
      policyId: selectedPolicyId,
      conditionType,
      conditionValue,
    };

    try {
      setConditionSaving(true);

      const isEdit =
        conditionFormDialog.mode === "edit" && conditionFormDialog.conditionId !== null;
      const url = isEdit
        ? `${conditionsEndpoint}/${conditionFormDialog.conditionId}`
        : conditionsEndpoint;

      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: {
          accept: "*/*",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || data?.responseStatus === "FAILURE") {
        throw new Error(
          data?.responseMessage ||
            (isEdit
              ? "Failed to update policy condition"
              : "Failed to create policy condition")
        );
      }

      showToast(
        data?.responseMessage ||
          (isEdit
            ? "Return policy condition updated successfully"
            : "Return policy condition created successfully")
      );

      closeConditionFormDialog();
      await fetchConditions(selectedPolicyId);
    } catch (err: any) {
      showError(
        err?.message ||
          (conditionFormDialog.mode === "edit"
            ? "Failed to update policy condition"
            : "Failed to create policy condition")
      );
    } finally {
      setConditionSaving(false);
    }
  };

  const openMapProductsDialog = async (policy: ReturnPolicy) => {
    setMapProductsDialog({ open: true, policy });
    setSelectedCategoryId("");
    setCategoryProducts([]);
    setProductsError("");
    setSelectedProductIds([]);
    setMappedProducts([]);
    setCategoryPolicyInfo([]);
    await fetchProductCategories();
  };

  const closeMapProductsDialog = () => {
    setMapProductsDialog({ open: false, policy: null });
    setSelectedCategoryId("");
    setCategoryProducts([]);
    setProductsError("");
    setSelectedProductIds([]);
    setMappedProducts([]);
    setUnmappingId(null);
    setCategoryPolicyInfo([]);
    setEditMappingDialog({ open: false, mappingId: null, productTitle: "", policyId: "", priority: "" });
  };

  const handleSearchProductsByCategory = async () => {
    if (!selectedCategoryId) {
      showError("Please select a product category");
      return;
    }

    const policyId = mapProductsDialog.policy?.id;
    try {
      setProductsLoading(true);
      setProductsError("");
      setCategoryPolicyInfo([]);

      const [productsRes, categoryPolicyRes] = await Promise.all([
        fetch(`${baseUrl}/products/categories/${selectedCategoryId}/products`, {
          method: "GET",
          headers: { accept: "*/*" },
          cache: "no-store",
        }),
        fetch(`${baseUrl}/api/return-policy/by-category?categoryIds=${selectedCategoryId}`, {
          headers: { accept: "*/*" },
          cache: "no-store",
        }),
      ]);

      if (!productsRes.ok) {
        throw new Error("Failed to fetch products for selected category");
      }

      const productsData = await productsRes.json();
      setCategoryProducts(Array.isArray(productsData) ? productsData : []);
      setSelectedProductIds([]);

      if (categoryPolicyRes.ok) {
        const categoryPolicyData = await categoryPolicyRes.json();
        setCategoryPolicyInfo(Array.isArray(categoryPolicyData) ? categoryPolicyData : []);
      }

      // Also load product-level mappings for this policy so unmapping still works
      if (policyId) await fetchMappedProducts(policyId);
    } catch (err: any) {
      setCategoryProducts([]);
      setSelectedProductIds([]);
      setProductsError(err?.message || "Failed to fetch category products");
      showError(err?.message || "Failed to fetch category products");
    } finally {
      setProductsLoading(false);
    }
  };

  const toggleProductSelection = (productId: number) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const toggleSelectAllVisibleProducts = () => {
    const mappedEntityIds = new Set(mappedProducts.map((m) => m.entityId));
    const unmappedIds = categoryProducts.filter((p) => !mappedEntityIds.has(p.id)).map((p) => p.id);
    const allSelected =
      unmappedIds.length > 0 && unmappedIds.every((id) => selectedProductIds.includes(id));

    if (allSelected) {
      setSelectedProductIds([]);
      return;
    }

    setSelectedProductIds(unmappedIds);
  };

  const handleMapSelectedProducts = async () => {
    const policyId = mapProductsDialog.policy?.id;
    if (!policyId) {
      showError("Policy id is not available");
      return;
    }

    if (selectedProductIds.length === 0) {
      showError("Please select at least one product");
      return;
    }

    try {
      setMappingLoading(true);

      const sortedSelectedIds = categoryProducts
        .map((p) => p.id)
        .filter((id) => selectedProductIds.includes(id));

      const results = await Promise.all(
        sortedSelectedIds.map(async (productId, index) => {
          const payload = {
            policyId,
            entityType: "PRODUCTS",
            entityId: productId,
            priority: index + 1,
          };

          const res = await fetch(policyMappingsEndpoint, {
            method: "POST",
            headers: {
              accept: "*/*",
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });

          const data = await res.json().catch(() => null);
          if (!res.ok || data?.responseStatus === "FAILURE") {
            throw new Error(data?.responseMessage || `Failed to map product id ${productId}`);
          }

          return data;
        })
      );

      if (results.length > 0) {
        showToast("Selected products mapped successfully");
        setSelectedProductIds([]);
        await fetchMappedProducts(policyId);
      }
    } catch (err: any) {
      showError(err?.message || "Failed to map selected products");
    } finally {
      setMappingLoading(false);
    }
  };

  const handleUnmapProduct = async (mappingId: number) => {
    const policyId = mapProductsDialog.policy?.id;
    if (!policyId) return;
    try {
      setUnmappingId(mappingId);
      const res = await fetch(`${policyMappingsEndpoint}/${mappingId}`, {
        method: "DELETE",
        headers: { accept: "*/*" },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.responseStatus === "FAILURE") {
        throw new Error(data?.responseMessage || "Failed to unmap product");
      }
      showToast("Product unmapped successfully");
      await fetchMappedProducts(policyId);
    } catch (err: any) {
      showError(err?.message || "Failed to unmap product");
    } finally {
      setUnmappingId(null);
    }
  };

  const openEditMapping = (m: MappedProduct) => {
    setEditMappingDialog({
      open: true,
      mappingId: m.id,
      productTitle:
        m.productTitle ||
        categoryProducts.find((p) => p.id === m.entityId)?.title ||
        `Product ${m.entityId}`,
      policyId: String(m.policyId),
      priority: m.priority !== undefined && m.priority !== null ? String(m.priority) : "0",
    });
  };

  const handleEditMappingSubmit = async () => {
    const { mappingId, policyId, priority } = editMappingDialog;
    if (!mappingId) return;
    const parsedPolicyId = Number(policyId);
    const parsedPriority = Number(priority);
    if (!policyId || isNaN(parsedPolicyId) || parsedPolicyId <= 0) {
      showError("Please select a valid return policy");
      return;
    }
    if (priority !== "" && isNaN(parsedPriority)) {
      showError("Priority must be a number");
      return;
    }
    try {
      setEditMappingSaving(true);
      const res = await fetch(`${policyMappingsEndpoint}/${mappingId}`, {
        method: "PUT",
        headers: { accept: "*/*", "Content-Type": "application/json" },
        body: JSON.stringify({ policyId: parsedPolicyId, priority: parsedPriority }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.responseStatus === "FAILURE") {
        throw new Error(data?.responseMessage || "Failed to update mapping");
      }
      showToast(data?.responseMessage || "Mapping updated successfully");
      setEditMappingDialog({ open: false, mappingId: null, productTitle: "", policyId: "", priority: "" });
      const currentPolicyId = mapProductsDialog.policy?.id;
      if (currentPolicyId) await fetchMappedProducts(currentPolicyId);
    } catch (err: any) {
      showError(err?.message || "Failed to update mapping");
    } finally {
      setEditMappingSaving(false);
    }
  };

  const mappedEntityIds = new Set(mappedProducts.map((m) => m.entityId));
  const categoryProductIds = new Set(categoryProducts.map((p) => p.id));
  const mappedInCategory = mappedProducts.filter((m) => categoryProductIds.has(m.entityId));

  return (
    <div className="bg-white flex flex-col min-h-screen max-w-screen-2xl mx-auto">
      <DashboardSidebar />
      <div className="flex flex-col w-full p-6 max-xl:p-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-blue-600">Return Policies</h1>
          <button
            type="button"
            className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
            onClick={openAddPolicy}
          >
            Add New Policy
          </button>
        </div>

        <p className="mt-2 text-gray-600">Manage return policy rules for products.</p>

        <div className="mt-6 rounded-lg border border-gray-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">ID</th>
                  <th className="px-4 py-3 text-left font-semibold">Name</th>
                  <th className="px-4 py-3 text-left font-semibold">Description</th>
                  <th className="px-4 py-3 text-left font-semibold">Return Window (Days)</th>
                  <th className="px-4 py-3 text-left font-semibold">Is Returnable</th>
                  <th className="px-4 py-3 text-left font-semibold">Map products link</th>
                  <th className="px-4 py-3 text-left font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="px-4 py-4 text-gray-500" colSpan={7}>
                      Loading return policies...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td className="px-4 py-4 text-red-600" colSpan={7}>
                      {error}
                    </td>
                  </tr>
                ) : policies.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-gray-500" colSpan={7}>
                      No return policies found.
                    </td>
                  </tr>
                ) : (
                  policies.map((policy) => (
                    <tr key={policy.id} className="border-t">
                      <td className="px-4 py-3">{policy.id}</td>
                      <td className="px-4 py-3">{policy.name}</td>
                      <td className="px-4 py-3">{policy.description}</td>
                      <td className="px-4 py-3">{policy.returnWindowDays}</td>
                      <td className="px-4 py-3">{policy.isReturnable ? "Yes" : "No"}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          className="text-blue-600 hover:underline font-medium"
                          onClick={() => openMapProductsDialog(policy)}
                        >
                          Map products link
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            className="text-blue-600 hover:underline font-medium"
                            onClick={() => openEditPolicy(policy)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="text-blue-600 hover:underline font-medium"
                            onClick={() => openConditionsDialog(policy)}
                          >
                            View/Edit Policy Conditions
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {formDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {formDialog.mode === "edit" ? "Edit Return Policy" : "Add Return Policy"}
              </h3>
              <button
                type="button"
                className="text-sm text-gray-500 hover:text-gray-700"
                onClick={closeDialog}
                disabled={saving}
              >
                Close
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  className="w-full border rounded px-3 py-2 text-sm"
                  rows={4}
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Return Window Days</label>
                <input
                  type="number"
                  min={0}
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={form.returnWindowDays}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, returnWindowDays: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Is Returnable</label>
                <select
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={form.isReturnable ? "true" : "false"}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      isReturnable: e.target.value === "true",
                    }))
                  }
                >
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                className="px-4 py-2 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
                onClick={closeDialog}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                onClick={handleSubmit}
                disabled={saving}
              >
                {saving ? "Saving..." : formDialog.mode === "edit" ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {conditionsDialog.open && conditionsDialog.policy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded shadow-xl w-full max-w-4xl max-h-[85vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                Policy Conditions - {conditionsDialog.policy.name}
              </h3>
              <button
                type="button"
                className="text-sm text-gray-500 hover:text-gray-700"
                onClick={closeConditionsDialog}
                disabled={conditionSaving}
              >
                Close
              </button>
            </div>

            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-600">
                Policy ID: {conditionsDialog.policy.id}
              </p>
              <button
                type="button"
                className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
                onClick={openAddCondition}
              >
                Add New Policy Condition
              </button>
            </div>

            <div className="rounded border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">ID</th>
                      <th className="px-4 py-3 text-left font-semibold">Condition Type</th>
                      <th className="px-4 py-3 text-left font-semibold">Condition Value</th>
                      <th className="px-4 py-3 text-left font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {conditionsLoading ? (
                      <tr>
                        <td className="px-4 py-4 text-gray-500" colSpan={4}>
                          Loading policy conditions...
                        </td>
                      </tr>
                    ) : conditionsError ? (
                      <tr>
                        <td className="px-4 py-4 text-red-600" colSpan={4}>
                          {conditionsError}
                        </td>
                      </tr>
                    ) : conditions.length === 0 ? (
                      <tr>
                        <td className="px-4 py-4 text-gray-500" colSpan={4}>
                          No policy conditions found.
                        </td>
                      </tr>
                    ) : (
                      conditions.map((condition) => (
                        <tr key={condition.id} className="border-t">
                          <td className="px-4 py-3">{condition.id}</td>
                          <td className="px-4 py-3">{condition.conditionType}</td>
                          <td className="px-4 py-3">{condition.conditionValue}</td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              className="text-blue-600 hover:underline font-medium"
                              onClick={() => openEditCondition(condition)}
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {conditionFormDialog.open && conditionsDialog.open && conditionsDialog.policy && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {conditionFormDialog.mode === "edit"
                  ? "Edit Policy Condition"
                  : "Add Policy Condition"}
              </h3>
              <button
                type="button"
                className="text-sm text-gray-500 hover:text-gray-700"
                onClick={closeConditionFormDialog}
                disabled={conditionSaving}
              >
                Close
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Condition Type</label>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={conditionForm.conditionType}
                  onChange={(e) =>
                    setConditionForm((prev) => ({ ...prev, conditionType: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Condition Value</label>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={conditionForm.conditionValue}
                  onChange={(e) =>
                    setConditionForm((prev) => ({ ...prev, conditionValue: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                className="px-4 py-2 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
                onClick={closeConditionFormDialog}
                disabled={conditionSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                onClick={handleConditionSubmit}
                disabled={conditionSaving}
              >
                {conditionSaving
                  ? "Saving..."
                  : conditionFormDialog.mode === "edit"
                  ? "Update"
                  : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {mapProductsDialog.open && mapProductsDialog.policy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded shadow-xl w-full max-w-4xl max-h-[85vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                Map Products - {mapProductsDialog.policy.name}
              </h3>
              <button
                type="button"
                className="text-sm text-gray-500 hover:text-gray-700"
                onClick={closeMapProductsDialog}
              >
                Close
              </button>
            </div>

            {/* Already Mapped Products â€” driven by by-category API */}
            <div className="mb-5">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                Existing Return Policy Mapping for Selected Category
              </h4>
              {(productsLoading || categoryPolicyLoading) ? (
                <p className="text-sm text-gray-500">Loading...</p>
              ) : categoryProducts.length === 0 ? (
                <p className="text-sm text-gray-400 italic">Select a category and click Search to see existing mappings.</p>
              ) : categoryPolicyInfo.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No return policy mapped to this category.</p>
              ) : (
                <div className="rounded border border-gray-200 overflow-hidden">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-gray-700">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold">Category</th>
                        <th className="px-4 py-2 text-left font-semibold">Mapped Policy</th>
                        <th className="px-4 py-2 text-left font-semibold">Return Window</th>
                        <th className="px-4 py-2 text-left font-semibold">Returnable</th>
                        <th className="px-4 py-2 text-left font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoryPolicyInfo.map((entry) => {
                        const isSamePolicy = entry.returnPolicy?.policyId === mapProductsDialog.policy?.id;
                        return (
                          <tr key={entry.categoryId} className="border-t">
                            <td className="px-4 py-2 font-medium">{entry.categoryName ?? `Category ${entry.categoryId}`}</td>
                            <td className="px-4 py-2">
                              {entry.returnPolicy ? entry.returnPolicy.name : <span className="text-gray-400 italic">None</span>}
                            </td>
                            <td className="px-4 py-2">
                              {entry.returnPolicy ? `${entry.returnPolicy.returnWindowDays} days` : "â€”"}
                            </td>
                            <td className="px-4 py-2">
                              {entry.returnPolicy ? (entry.returnPolicy.isReturnable ? "Yes" : "No") : "â€”"}
                            </td>
                            <td className="px-4 py-2">
                              {!entry.returnPolicy ? (
                                <span className="inline-block px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-500 font-medium">Not mapped</span>
                              ) : isSamePolicy ? (
                                <span className="inline-block px-2 py-0.5 rounded text-xs bg-green-100 text-green-700 font-medium">This policy</span>
                              ) : (
                                <span className="inline-block px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-800 font-medium">Different policy</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Product-level mappings for this policy within the selected category */}
              {categoryProducts.length > 0 && mappedInCategory.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-medium text-gray-600 mb-2">
                    Individually mapped products in this category ({mappedInCategory.length}):
                  </p>
                  <div className="rounded border border-gray-200 overflow-hidden">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 text-gray-700">
                        <tr>
                          <th className="px-4 py-2 text-left font-semibold">Product ID</th>
                          <th className="px-4 py-2 text-left font-semibold">Title</th>
                          <th className="px-4 py-2 text-left font-semibold">Mapped Policy</th>
                          <th className="px-4 py-2 text-left font-semibold">Priority</th>
                          <th className="px-4 py-2 text-left font-semibold">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mappedInCategory.map((m) => (
                          <tr key={m.id} className="border-t">
                            <td className="px-4 py-2">{m.entityId}</td>
                            <td className="px-4 py-2 text-gray-600">
                              {m.productTitle ||
                                categoryProducts.find((p) => p.id === m.entityId)?.title ||
                                "â€”"}
                            </td>
                            <td className="px-4 py-2 text-gray-600">{m.policyName || `Policy #${m.policyId}`}</td>
                            <td className="px-4 py-2">{m.priority ?? "â€”"}</td>
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  className="text-blue-600 hover:underline font-medium disabled:opacity-50"
                                  disabled={unmappingId === m.id}
                                  onClick={() => openEditMapping(m)}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="text-red-600 hover:underline font-medium disabled:opacity-50"
                                  disabled={unmappingId === m.id}
                                  onClick={() => handleUnmapProduct(m.id)}
                                >
                                  {unmappingId === m.id ? "Unmapping..." : "Unmap"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-end mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Product Category</label>
                <select
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  disabled={categoriesLoading}
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={String(cat.id)}>
                      {cat.title}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                onClick={handleSearchProductsByCategory}
                disabled={categoriesLoading || productsLoading || mappingLoading}
              >
                Search
              </button>
            </div>

            <div className="flex justify-end mb-3">
              <button
                type="button"
                className="px-4 py-2 text-sm rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                onClick={handleMapSelectedProducts}
                disabled={productsLoading || mappingLoading || selectedProductIds.length === 0}
              >
                {mappingLoading ? "Mapping..." : "Map Selected Products"}
              </button>
            </div>

            {categoriesLoading && (
              <p className="text-sm text-gray-500 mb-3">Loading product categories...</p>
            )}

            <div className="rounded border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">
                        <input
                          type="checkbox"
                          checked={
                            categoryProducts.filter((p) => !mappedEntityIds.has(p.id)).length > 0 &&
                            categoryProducts.filter((p) => !mappedEntityIds.has(p.id)).every((p) => selectedProductIds.includes(p.id))
                          }
                          onChange={toggleSelectAllVisibleProducts}
                          disabled={categoryProducts.length === 0 || mappingLoading}
                        />
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">Product ID</th>
                      <th className="px-4 py-3 text-left font-semibold">Title</th>
                      <th className="px-4 py-3 text-left font-semibold">Price</th>
                      <th className="px-4 py-3 text-left font-semibold">SKU</th>
                      <th className="px-4 py-3 text-left font-semibold">Stock</th>
                      <th className="px-4 py-3 text-left font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productsLoading ? (
                      <tr>
                        <td className="px-4 py-4 text-gray-500" colSpan={7}>
                          Loading products...
                        </td>
                      </tr>
                    ) : productsError ? (
                      <tr>
                        <td className="px-4 py-4 text-red-600" colSpan={7}>
                          {productsError}
                        </td>
                      </tr>
                    ) : categoryProducts.length === 0 ? (
                      <tr>
                        <td className="px-4 py-4 text-gray-500" colSpan={7}>
                          No products to display. Select category and click Search.
                        </td>
                      </tr>
                    ) : (
                      categoryProducts.map((product) => {
                        const isAlreadyMapped = mappedEntityIds.has(product.id);
                        return (
                        <tr key={product.id} className={`border-t ${isAlreadyMapped ? "bg-gray-50 text-gray-400" : ""}`}>
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedProductIds.includes(product.id)}
                              onChange={() => toggleProductSelection(product.id)}
                              disabled={mappingLoading || isAlreadyMapped}
                            />
                          </td>
                          <td className="px-4 py-3">{product.id}</td>
                          <td className="px-4 py-3">{product.title}</td>
                          <td className="px-4 py-3">
                            {product.currency || "INR"} {Number(product.price || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-3">{product.sku || "-"}</td>
                          <td className="px-4 py-3">{product.stock ?? product.inStock ?? "-"}</td>
                          <td className="px-4 py-3">
                            {isAlreadyMapped ? (
                              <span className="inline-block px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-800 font-medium">
                                Already mapped
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded text-xs bg-green-100 text-green-700 font-medium">
                                Available
                              </span>
                            )}
                          </td>
                        </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {editMappingDialog.open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Edit Mapping</h3>
              <button
                type="button"
                className="text-sm text-gray-500 hover:text-gray-700"
                onClick={() =>
                  setEditMappingDialog({ open: false, mappingId: null, productTitle: "", policyId: "", priority: "" })
                }
                disabled={editMappingSaving}
              >
                Close
              </button>
            </div>

            <p className="text-sm text-gray-500 mb-4">
              Product: <span className="font-medium text-gray-700">{editMappingDialog.productTitle}</span>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Return Policy</label>
                <select
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={editMappingDialog.policyId}
                  onChange={(e) =>
                    setEditMappingDialog((prev) => ({ ...prev, policyId: e.target.value }))
                  }
                  disabled={editMappingSaving}
                >
                  <option value="">Select policy</option>
                  {policies.map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Priority</label>
                <input
                  type="number"
                  min={0}
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={editMappingDialog.priority}
                  onChange={(e) =>
                    setEditMappingDialog((prev) => ({ ...prev, priority: e.target.value }))
                  }
                  disabled={editMappingSaving}
                />
                <p className="text-xs text-gray-400 mt-1">Higher value = higher priority</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                className="px-4 py-2 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
                onClick={() =>
                  setEditMappingDialog({ open: false, mappingId: null, productTitle: "", policyId: "", priority: "" })
                }
                disabled={editMappingSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                onClick={handleEditMappingSubmit}
                disabled={editMappingSaving}
              >
                {editMappingSaving ? "Saving..." : "Update"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReturnPoliciesPage;
