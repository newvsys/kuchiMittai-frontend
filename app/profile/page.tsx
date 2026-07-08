"use client";
import React, { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const showToast = async (msg: string, type: "success" | "error" = "success") => {
  const { default: toast } = await import("react-hot-toast");
  type === "success" ? toast.success(msg) : toast.error(msg);
};

interface CustomerAddress {
  addressId: number;
  addressType: string;
  recipientName: string;
  addressLine1: string;
  addressLine2: string;
  landMark: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  contactNumber: string;
}

interface Customer {
  customerId: number;
  firstName: string;
  email: string;
  mobileNumber: string;
  customerType: string;
  status: string;
  addresses: CustomerAddress[];
}

interface AddressErrors {
  recipientName?: string;
  addressLine1?: string;
  contactNumber?: string;
  postalCode?: string;
}

const ProfilePage = () => {
  const { data: session, status } = useSession();

  const router = useRouter();
  const abortRef = useRef<AbortController | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [addressErrors, setAddressErrors] = useState<AddressErrors[]>([]);
  const [activeTab, setActiveTab] = useState<"profile" | "addresses">("profile");
  const [editingAddressIndex, setEditingAddressIndex] = useState<number | null>(null);
  const [addressMenuOpenIndex, setAddressMenuOpenIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isNavigatingToOrders, setIsNavigatingToOrders] = useState(false);
  const [profileEditState, setProfileEditState] = useState({
    name: false,
    email: false,
    mobile: false,
  });
  const [profileOriginal, setProfileOriginal] = useState({
    name: "",
    email: "",
    mobile: "",
  });
  const [originalAddresses, setOriginalAddresses] = useState<CustomerAddress[]>([]);

  const fetchCustomer = async () => {
    if (!session) return;
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";
      const res = await fetch(`${API_BASE_URL}/user/get-customer-details?userId=${(session as any).user.id}`, { signal: abortRef.current.signal });
      if (!res.ok) throw new Error("Failed to fetch customer details");
      const data = await res.json();
      setCustomer(data);
      setProfileOriginal({
        name: data.firstName || "",
        email: data.email || "",
        mobile: data.mobileNumber || "",
      });
      setOriginalAddresses(data.addresses || []);
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      setError(err.message || "Error fetching customer details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.replace("/login");
      return;
    }
    const timer = setTimeout(() => { fetchCustomer(); }, 0);
    return () => { clearTimeout(timer); abortRef.current?.abort(); };
  }, [session, status, router]);

  const handleAddressChange = (idx: number, field: keyof CustomerAddress, value: string) => {
    // Update address value
    setCustomer(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        addresses: prev.addresses.map((addr, i) =>
          i === idx ? { ...addr, [field]: value } : addr
        ),
      };
    });

    // If there were validation errors, clear the error for this specific field as user corrects it
    setAddressErrors(prev => {
      if (!prev || !prev.length) return prev;
      const next = [...prev];
      if (!next[idx]) return prev;

      const entry = { ...next[idx] };
      if (field === "recipientName") entry.recipientName = '';
      if (field === "addressLine1") entry.addressLine1 = '';
      if (field === "contactNumber") entry.contactNumber = '';
      if (field === "postalCode") entry.postalCode = '';

      next[idx] = entry;
      return next;
    });
  };

  const addAddress = () => {
    if (!customer) return;
    if ((customer.addresses || []).length >= 4) {
      showToast("You can add up to 4 addresses only.", "error");
      return;
    }
    // Clear previous validation highlights when starting to add a new address
    setAddressErrors([]);
    const emptyAddress: CustomerAddress = {
      addressId: 0 as any,
      addressType: "Shipping",
      recipientName: "",
      addressLine1: "",
      addressLine2: "",
      landMark: "",
      city: "",
      state: "",
      country: "India",
      postalCode: "",
      contactNumber: "",
    };

    const updatedAddresses = [emptyAddress, ...customer.addresses];
    setCustomer({
      ...customer,
      addresses: updatedAddresses,
    });
    setOriginalAddresses(prev => [emptyAddress, ...prev]);
    setEditingAddressIndex(0);
  };

  const removeAddress = async (addressId: number) => {
    if (!customer || isSaving) return;

    const filteredAddresses = customer.addresses.filter(addr => addr.addressId !== addressId);
    if (filteredAddresses.length === customer.addresses.length) {
      return;
    }

    setIsSaving(true);
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";
      const updatedCustomer = {
        ...customer,
        addresses: filteredAddresses.map(a => ({
          ...a,
          country: "India",
          addressType: "Shipping",
        })),
      };

      const res = await fetch(`${API_BASE_URL}/user/update-customer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedCustomer),
      });
      if (!res.ok) throw new Error("Failed to delete address");

      setEditingAddressIndex(null);
      setAddressMenuOpenIndex(null);
      await fetchCustomer();
      showToast("Address deleted successfully!");
    } catch (err: any) {
      showToast(err.message || "Error deleting address", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const saveAddress = async (index: number) => {
    if (!customer || isSaving) return;
    const addr = customer.addresses[index];
    if (!addr) return;

    const postal = (addr.postalCode || "").trim();
    const recipient = (addr.recipientName || "").trim();
    const line1 = (addr.addressLine1 || "").trim();
    const mobile = (addr.contactNumber || "").trim();

    const entry: AddressErrors = {};

    if (!recipient) entry.recipientName = "This field is mandatory";
    if (!line1) entry.addressLine1 = "This field is mandatory";
    if (!mobile) entry.contactNumber = "This field is mandatory";
    else if (!/^[6-9]\d{9}$/.test(mobile)) entry.contactNumber = "Enter a valid 10-digit mobile number";
    if (!postal) entry.postalCode = "This field is mandatory";
    else if (!/^\d{6}$/.test(postal)) entry.postalCode = "Enter a valid 6-digit postal code";

    const hasErrors = Object.values(entry).some(Boolean);
    if (hasErrors) {
      setAddressErrors(prev => {
        const next = [...prev];
        next[index] = entry;
        return next;
      });
      return;
    }

    // clear errors for this address
    setAddressErrors(prev => {
      const next = [...prev];
      next[index] = {};
      return next;
    });

    setIsSaving(true);
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";
      const updatedCustomer = {
        ...customer,
        addresses: customer.addresses.map(a => ({
          ...a,
          country: "India",
          addressType: "Shipping",
        })),
      };
      const res = await fetch(`${API_BASE_URL}/user/update-customer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedCustomer),
      });
      if (!res.ok) throw new Error("Failed to update customer details");

      setEditingAddressIndex(null);
      setAddressMenuOpenIndex(null);
      await fetchCustomer();
      showToast("Address updated successfully!");
    } catch (err: any) {
      showToast(err.message || "Error updating address", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const saveProfileField = async (field: "name" | "email" | "mobile") => {
    if (!customer || isSaving) return;
    setIsSaving(true);
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";
      const res = await fetch(`${API_BASE_URL}/user/update-customer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customer),
      });
      if (!res.ok) throw new Error("Failed to update customer details");

      setProfileOriginal(prev => ({
        ...prev,
        [field]:
          field === "name"
            ? customer.firstName
            : field === "email"
            ? customer.email
            : customer.mobileNumber,
      }));

      setProfileEditState(prev => ({ ...prev, [field]: false }));
      showToast("Profile updated successfully!");
    } catch (err: any) {
      showToast(err.message || "Error updating profile", "error");
    } finally {
      setIsSaving(false);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    // Remove customerId from payload
    const { customerId, ...rest } = customer;
    let updatedCustomer = { ...rest };
    // If addresses is empty but the user has filled the first address fields, add it
    if (!updatedCustomer.addresses || updatedCustomer.addresses.length === 0) {
      // Try to get values from the first address form fields (if present in DOM)
      const form = e.target as HTMLFormElement;
      const recipientName = form.querySelector('input[placeholder="Recipient Name"]')?.value || "";
      const addressLine1 = form.querySelector('input[placeholder="Address Line 1"]')?.value || "";
      const addressLine2 = form.querySelector('input[placeholder="Address Line 2"]')?.value || "";
      const landMark = form.querySelector('input[placeholder="Landmark"]')?.value || "";
      const city = form.querySelector('input[placeholder="City"]')?.value || "";
      const state = form.querySelector('input[placeholder="State"]')?.value || "";
      const country = "India";
      const postalCode = form.querySelector('input[placeholder="Postal Code"]')?.value || "";
      const contactNumber = form.querySelector('input[placeholder="Contact Number"]')?.value || "";
      if (
        recipientName || addressLine1 || addressLine2 || landMark || city || state || country || postalCode || contactNumber
      ) {
        updatedCustomer.addresses = [
          {
            addressId: null,
            recipientName,
            addressType: "Shipping",
            addressLine1,
            addressLine2,
            landMark,
            city,
            state,
            country: "India",
            postalCode,
            contactNumber,
          },
        ];
      }
    }

    // Always force country to India and addressType to Shipping on all addresses before sending to backend
    if (updatedCustomer.addresses && updatedCustomer.addresses.length > 0) {
      updatedCustomer.addresses = updatedCustomer.addresses.map((addr: any) => ({
        ...addr,
        country: "India",
        addressType: "Shipping",
      }));

      // Validate mandatory fields, postal codes, and mobile numbers for all addresses
      const errors: AddressErrors[] = updatedCustomer.addresses.map((addr: any) => {
        const postal = (addr.postalCode || "").trim();
        const recipient = (addr.recipientName || "").trim();
        const line1 = (addr.addressLine1 || "").trim();
        const mobile = (addr.contactNumber || "").trim();

        const entry: AddressErrors = {};

        if (!recipient) entry.recipientName = "This field is mandatory";
        if (!line1) entry.addressLine1 = "This field is mandatory";
        // Indian mobile: 10 digits starting from 6-9
        if (!mobile) entry.contactNumber = "This field is mandatory";
        else if (!/^[6-9]\d{9}$/.test(mobile)) entry.contactNumber = "Enter a valid 10-digit mobile number";
        if (!postal) entry.postalCode = "This field is mandatory";
        else if (!/^\d{6}$/.test(postal)) entry.postalCode = "Enter a valid 6-digit postal code";

        return entry;
      });

      const hasErrors = errors.some(e => Object.values(e).some(Boolean));

      if (hasErrors) {
        setAddressErrors(errors);
        return;
      }

      // Clear any previous address error highlights when everything is valid
      setAddressErrors([]);
    }
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";
      const res = await fetch(`${API_BASE_URL}/user/update-customer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedCustomer),
      });
      if (!res.ok) throw new Error("Failed to update customer details");
      showToast("Profile updated successfully!");
    } catch (err: any) {
      showToast(err.message || "Error updating profile", "error");
    }
  };

  if (status === "loading" || !session || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Banner */}
        <div className="h-20 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500" />
        <div className="w-full px-4 sm:px-6 lg:px-8">
          {/* Avatar row */}
          <div className="-mt-14 mb-8 flex items-end gap-4">
            <div className="w-24 h-24 rounded-full ring-4 ring-white shadow-lg bg-gray-200 animate-pulse flex-shrink-0" />
            <div className="mb-2 space-y-2">
              <div className="h-5 w-36 bg-gray-200 rounded animate-pulse" />
              <div className="h-3 w-48 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
          <div className="flex gap-6 items-start pb-12">
            {/* Sidebar */}
            <div className="w-96 flex-shrink-0 bg-white rounded-2xl border border-gray-200 p-3 space-y-1">
              {[1,2,3].map(i => <div key={i} className="h-9 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
            {/* Main content */}
            <div className="flex-1 bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="h-12 bg-gray-100 animate-pulse" />
              <div className="p-6 space-y-5">
                {[1,2,3].map(i => (
                  <div key={i} className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div className="space-y-1.5">
                      <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
                      <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
                    </div>
                    <div className="h-8 w-16 bg-gray-100 rounded-lg animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-500 text-sm">{error}</div>
      </div>
    );
  }
  if (!customer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-sm">No customer data found.</div>
      </div>
    );
  }

  const initials = customer.firstName ? customer.firstName.slice(0, 2).toUpperCase() : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Banner */}
      <div className="h-20 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500" />

      <div className="w-full px-4 sm:px-6 lg:px-8">
        {/* Avatar row — overlaps banner */}
        <div className="-mt-14 mb-8 flex items-end gap-4">
          <div className="w-24 h-24 rounded-full ring-4 ring-white shadow-lg bg-white flex items-center justify-center flex-shrink-0 overflow-hidden">
            {initials ? (
              <span className="text-3xl font-bold text-blue-600">{initials}</span>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            )}
          </div>
          <div className="mb-2">
            <h1 className="text-xl font-bold text-gray-900">{customer.firstName || "My Account"}</h1>
          </div>
        </div>

        <div className="flex gap-6 items-start pb-12">

          {/* Sidebar nav */}
          <aside className="w-96 flex-shrink-0 bg-white rounded-2xl border border-gray-200 p-3">
            {([
              { key: "profile", label: "Profile Info", icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg> },
              { key: "addresses", label: "Addresses", icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg> },
            ] as const).map(({ key, label, icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`w-full text-left px-3 py-3 rounded-xl text-xl font-medium mb-1 transition-colors flex items-center gap-3 ${
                  activeTab === key
                    ? "bg-blue-50 text-blue-600"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                {icon}
                {label}
              </button>
            ))}
            <hr className="my-2 border-gray-100" />
            <button
              type="button"
              onClick={() => { setIsNavigatingToOrders(true); router.push("/order-history"); }}
              disabled={isNavigatingToOrders}
              className="w-full text-left px-3 py-3 rounded-xl text-xl font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors flex items-center gap-3 disabled:opacity-70"
            >
              {isNavigatingToOrders ? (
                <svg className="h-7 w-7 animate-spin text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              )}
              {isNavigatingToOrders ? "Loading..." : "My Orders"}
            </button>
          </aside>

          {/* Main content */}
          <form onSubmit={handleSubmit} className="flex-1 min-w-0">

            {/* ── Profile Info tab ── */}
            {activeTab === "profile" && (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="bg-gray-300 px-6 py-4 border-b border-gray-400">
                  <h3 className="text-base font-semibold text-gray-800">Profile Information</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Manage your personal details</p>
                </div>
                <div className="divide-y divide-gray-50 px-6">

                {/* Name */}
                <div className="py-4 flex items-start gap-4">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Full Name</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-gray-50 disabled:text-gray-400"
                        value={customer.firstName}
                        onChange={e => setCustomer({ ...customer, firstName: e.target.value })}
                        readOnly={!profileEditState.name}
                        disabled={!profileEditState.name}
                      />
                      <div className="flex gap-2 flex-shrink-0">
                        {!profileEditState.name ? (
                          <button type="button" className="text-xs text-blue-600 border border-blue-300 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                            onClick={() => setProfileEditState(prev => ({ ...prev, name: true }))}>{customer.firstName?.trim() ? "Edit" : "Add"}</button>
                        ) : (
                          <>
                            <button type="button" className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              disabled={isSaving}
                              onClick={() => saveProfileField("name")}>{isSaving ? "Saving..." : "Save"}</button>
                            <button type="button" className="text-xs text-gray-500 border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors"
                              onClick={() => { setCustomer({ ...customer, firstName: profileOriginal.name }); setProfileEditState(prev => ({ ...prev, name: false })); }}>Cancel</button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Email */}
                <div className="py-4 flex items-start gap-4">
                  <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Email Address</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="email"
                        className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-gray-50 disabled:text-gray-400"
                        value={customer.email}
                        onChange={e => setCustomer({ ...customer, email: e.target.value })}
                        readOnly={!profileEditState.email}
                        disabled={!profileEditState.email}
                      />
                      <div className="flex gap-2 flex-shrink-0">
                        {!profileEditState.email ? (
                          <button type="button" className="text-xs text-blue-600 border border-blue-300 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                            onClick={() => setProfileEditState(prev => ({ ...prev, email: true }))}>{customer.email?.trim() ? "Edit" : "Add"}</button>
                        ) : (
                          <>
                            <button type="button" className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              disabled={isSaving}
                              onClick={() => saveProfileField("email")}>{isSaving ? "Saving..." : "Save"}</button>
                            <button type="button" className="text-xs text-gray-500 border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors"
                              onClick={() => { setCustomer({ ...customer, email: profileOriginal.email }); setProfileEditState(prev => ({ ...prev, email: false })); }}>Cancel</button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mobile */}
                <div className="py-4 flex items-start gap-4">
                  <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 8.25h3" /></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Mobile Number</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-gray-50 disabled:text-gray-400"
                        value={customer.mobileNumber}
                        onChange={e => setCustomer({ ...customer, mobileNumber: e.target.value })}
                        readOnly={!profileEditState.mobile}
                        disabled={!profileEditState.mobile}
                      />
                      <div className="flex gap-2 flex-shrink-0">
                        {!profileEditState.mobile ? (
                          <button type="button" className="text-xs text-blue-600 border border-blue-300 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                            onClick={() => setProfileEditState(prev => ({ ...prev, mobile: true }))}>{customer.mobileNumber?.trim() ? "Edit" : "Add"}</button>
                        ) : (
                          <>
                            <button type="button" className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              disabled={isSaving}
                              onClick={() => saveProfileField("mobile")}>{isSaving ? "Saving..." : "Save"}</button>
                            <button type="button" className="text-xs text-gray-500 border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors"
                              onClick={() => { setCustomer({ ...customer, mobileNumber: profileOriginal.mobile }); setProfileEditState(prev => ({ ...prev, mobile: false })); }}>Cancel</button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                </div>
              </div>
            )}

            {/* ── Addresses tab ── */}
            {activeTab === "addresses" && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="bg-gray-300 border-b border-gray-400 -mx-6 -mt-6 px-6 py-3 mb-5 rounded-t-xl">
                  <h3 className="text-base font-semibold text-gray-800">Saved Addresses</h3>
                </div>

                {(customer.addresses || []).length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-gray-700 mb-1">No saved addresses yet</p>
                    <p className="text-xs text-gray-400">Add a delivery address for faster checkout</p>
                  </div>
                )}

                <div className="space-y-4">
                  {(customer.addresses || []).map((addr, idx) => (
                    <div key={addr.addressId} className="relative border border-gray-100 rounded-xl p-4">
                      {editingAddressIndex === idx ? (
                        /* Edit form */
                        <div className="space-y-4">
                          {/* Name + Mobile */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="relative">
                              <input
                                id={`recipientName-${idx}`}
                                type="text"
                                placeholder=" "
                                className={`peer block w-full rounded-md border px-3 pt-5 pb-2 text-sm text-gray-900 focus:outline-none focus:ring-1 transition-colors bg-white ${addressErrors[idx]?.recipientName ? "border-red-500 focus:border-red-500 focus:ring-red-500" : "border-gray-300 focus:border-blue-600 focus:ring-blue-600"}`}
                                value={addr.recipientName}
                                onChange={e => handleAddressChange(idx, "recipientName", e.target.value)}
                              />
                              <label
                                htmlFor={`recipientName-${idx}`}
                                className={`pointer-events-none absolute left-2.5 -top-2.5 bg-white px-1 text-xs transition-all duration-200 peer-placeholder-shown:top-3.5 peer-placeholder-shown:left-3 peer-placeholder-shown:text-sm peer-placeholder-shown:text-gray-400 peer-placeholder-shown:bg-transparent peer-placeholder-shown:px-0 peer-focus:-top-2.5 peer-focus:left-2.5 peer-focus:text-xs peer-focus:bg-white peer-focus:px-1 ${addressErrors[idx]?.recipientName ? "text-red-500 peer-focus:text-red-500" : "text-blue-600 peer-focus:text-blue-600"}`}
                              >
                                Name <span className="text-red-500 ml-0.5">*</span>
                              </label>
                              {addressErrors[idx]?.recipientName && <p className="mt-1 text-xs text-red-500">{addressErrors[idx].recipientName}</p>}
                            </div>
                            <div className="relative">
                              <input
                                id={`contactNumber-${idx}`}
                                type="text"
                                placeholder=" "
                                className={`peer block w-full rounded-md border px-3 pt-5 pb-2 text-sm text-gray-900 focus:outline-none focus:ring-1 transition-colors bg-white ${addressErrors[idx]?.contactNumber ? "border-red-500 focus:border-red-500 focus:ring-red-500" : "border-gray-300 focus:border-blue-600 focus:ring-blue-600"}`}
                                value={addr.contactNumber}
                                onChange={e => handleAddressChange(idx, "contactNumber", e.target.value)}
                              />
                              <label
                                htmlFor={`contactNumber-${idx}`}
                                className={`pointer-events-none absolute left-2.5 -top-2.5 bg-white px-1 text-xs transition-all duration-200 peer-placeholder-shown:top-3.5 peer-placeholder-shown:left-3 peer-placeholder-shown:text-sm peer-placeholder-shown:text-gray-400 peer-placeholder-shown:bg-transparent peer-placeholder-shown:px-0 peer-focus:-top-2.5 peer-focus:left-2.5 peer-focus:text-xs peer-focus:bg-white peer-focus:px-1 ${addressErrors[idx]?.contactNumber ? "text-red-500 peer-focus:text-red-500" : "text-blue-600 peer-focus:text-blue-600"}`}
                              >
                                Mobile <span className="text-red-500 ml-0.5">*</span>
                              </label>
                              {addressErrors[idx]?.contactNumber && <p className="mt-1 text-xs text-red-500">{addressErrors[idx].contactNumber}</p>}
                            </div>
                          </div>
                          {/* Address Line 1 */}
                          <div className="relative">
                            <input
                              id={`addressLine1-${idx}`}
                              type="text"
                              placeholder=" "
                              className={`peer block w-full rounded-md border px-3 pt-5 pb-2 text-sm text-gray-900 focus:outline-none focus:ring-1 transition-colors bg-white ${addressErrors[idx]?.addressLine1 ? "border-red-500 focus:border-red-500 focus:ring-red-500" : "border-gray-300 focus:border-blue-600 focus:ring-blue-600"}`}
                              value={addr.addressLine1}
                              onChange={e => handleAddressChange(idx, "addressLine1", e.target.value)}
                            />
                            <label
                              htmlFor={`addressLine1-${idx}`}
                              className={`pointer-events-none absolute left-2.5 -top-2.5 bg-white px-1 text-xs transition-all duration-200 peer-placeholder-shown:top-3.5 peer-placeholder-shown:left-3 peer-placeholder-shown:text-sm peer-placeholder-shown:text-gray-400 peer-placeholder-shown:bg-transparent peer-placeholder-shown:px-0 peer-focus:-top-2.5 peer-focus:left-2.5 peer-focus:text-xs peer-focus:bg-white peer-focus:px-1 ${addressErrors[idx]?.addressLine1 ? "text-red-500 peer-focus:text-red-500" : "text-blue-600 peer-focus:text-blue-600"}`}
                            >
                              Address Line 1 <span className="text-red-500 ml-0.5">*</span>
                            </label>
                            {addressErrors[idx]?.addressLine1 && <p className="mt-1 text-xs text-red-500">{addressErrors[idx].addressLine1}</p>}
                          </div>
                          {/* Address Line 2 */}
                          <div className="relative">
                            <input
                              id={`addressLine2-${idx}`}
                              type="text"
                              placeholder=" "
                              className="peer block w-full rounded-md border border-gray-300 px-3 pt-5 pb-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:border-blue-600 focus:ring-blue-600 transition-colors bg-white"
                              value={addr.addressLine2}
                              onChange={e => handleAddressChange(idx, "addressLine2", e.target.value)}
                            />
                            <label
                              htmlFor={`addressLine2-${idx}`}
                              className="pointer-events-none absolute left-2.5 -top-2.5 bg-white px-1 text-xs text-blue-600 transition-all duration-200 peer-placeholder-shown:top-3.5 peer-placeholder-shown:left-3 peer-placeholder-shown:text-sm peer-placeholder-shown:text-gray-400 peer-placeholder-shown:bg-transparent peer-placeholder-shown:px-0 peer-focus:-top-2.5 peer-focus:left-2.5 peer-focus:text-xs peer-focus:bg-white peer-focus:px-1 peer-focus:text-blue-600"
                            >
                              Address Line 2
                            </label>
                          </div>
                          {/* Landmark */}
                          <div className="relative">
                            <input
                              id={`landMark-${idx}`}
                              type="text"
                              placeholder=" "
                              className="peer block w-full rounded-md border border-gray-300 px-3 pt-5 pb-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:border-blue-600 focus:ring-blue-600 transition-colors bg-white"
                              value={addr.landMark}
                              onChange={e => handleAddressChange(idx, "landMark", e.target.value)}
                            />
                            <label
                              htmlFor={`landMark-${idx}`}
                              className="pointer-events-none absolute left-2.5 -top-2.5 bg-white px-1 text-xs text-blue-600 transition-all duration-200 peer-placeholder-shown:top-3.5 peer-placeholder-shown:left-3 peer-placeholder-shown:text-sm peer-placeholder-shown:text-gray-400 peer-placeholder-shown:bg-transparent peer-placeholder-shown:px-0 peer-focus:-top-2.5 peer-focus:left-2.5 peer-focus:text-xs peer-focus:bg-white peer-focus:px-1 peer-focus:text-blue-600"
                            >
                              Landmark
                            </label>
                          </div>
                          {/* Postal Code */}
                          <div className="relative">
                            <input
                              id={`postalCode-${idx}`}
                              type="text"
                              placeholder=" "
                              className={`peer block w-full rounded-md border px-3 pt-5 pb-2 text-sm text-gray-900 focus:outline-none focus:ring-1 transition-colors bg-white ${addressErrors[idx]?.postalCode ? "border-red-500 focus:border-red-500 focus:ring-red-500" : "border-gray-300 focus:border-blue-600 focus:ring-blue-600"}`}
                              value={addr.postalCode}
                              onChange={async e => {
                                const value = e.target.value;
                                handleAddressChange(idx, "postalCode", value);
                                const digits = value.replace(/[^0-9]/g, "");
                                if (digits.length === 6) {
                                  try {
                                    const res = await fetch(`https://api.postalpincode.in/pincode/${digits}`);
                                    if (res.ok) {
                                      const data = await res.json();
                                      const first = Array.isArray(data) && data[0] && Array.isArray(data[0].PostOffice) && data[0].PostOffice[0] ? data[0].PostOffice[0] : null;
                                      if (first) {
                                        if (first.District || first.Name) handleAddressChange(idx, "city", first.District || first.Name);
                                        if (first.State) handleAddressChange(idx, "state", first.State);
                                      }
                                    }
                                  } catch (err) { console.error("Failed to fetch city/state for pincode", err); }
                                }
                              }}
                            />
                            <label
                              htmlFor={`postalCode-${idx}`}
                              className={`pointer-events-none absolute left-2.5 -top-2.5 bg-white px-1 text-xs transition-all duration-200 peer-placeholder-shown:top-3.5 peer-placeholder-shown:left-3 peer-placeholder-shown:text-sm peer-placeholder-shown:text-gray-400 peer-placeholder-shown:bg-transparent peer-placeholder-shown:px-0 peer-focus:-top-2.5 peer-focus:left-2.5 peer-focus:text-xs peer-focus:bg-white peer-focus:px-1 ${addressErrors[idx]?.postalCode ? "text-red-500 peer-focus:text-red-500" : "text-blue-600 peer-focus:text-blue-600"}`}
                            >
                              Postal Code <span className="text-red-500 ml-0.5">*</span>
                            </label>
                            {addressErrors[idx]?.postalCode && <p className="mt-1 text-xs text-red-500">{addressErrors[idx].postalCode}</p>}
                          </div>
                          {/* City + State */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="relative">
                              <input
                                id={`city-${idx}`}
                                type="text"
                                placeholder=" "
                                className="peer block w-full rounded-md border border-gray-300 px-3 pt-5 pb-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:border-blue-600 focus:ring-blue-600 transition-colors bg-white"
                                value={addr.city}
                                onChange={e => handleAddressChange(idx, "city", e.target.value)}
                              />
                              <label
                                htmlFor={`city-${idx}`}
                                className="pointer-events-none absolute left-2.5 -top-2.5 bg-white px-1 text-xs text-blue-600 transition-all duration-200 peer-placeholder-shown:top-3.5 peer-placeholder-shown:left-3 peer-placeholder-shown:text-sm peer-placeholder-shown:text-gray-400 peer-placeholder-shown:bg-transparent peer-placeholder-shown:px-0 peer-focus:-top-2.5 peer-focus:left-2.5 peer-focus:text-xs peer-focus:bg-white peer-focus:px-1 peer-focus:text-blue-600"
                              >
                                City
                              </label>
                            </div>
                            <div className="relative">
                              <input
                                id={`state-${idx}`}
                                type="text"
                                placeholder=" "
                                className="peer block w-full rounded-md border border-gray-300 px-3 pt-5 pb-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:border-blue-600 focus:ring-blue-600 transition-colors bg-white"
                                value={addr.state}
                                onChange={e => handleAddressChange(idx, "state", e.target.value)}
                              />
                              <label
                                htmlFor={`state-${idx}`}
                                className="pointer-events-none absolute left-2.5 -top-2.5 bg-white px-1 text-xs text-blue-600 transition-all duration-200 peer-placeholder-shown:top-3.5 peer-placeholder-shown:left-3 peer-placeholder-shown:text-sm peer-placeholder-shown:text-gray-400 peer-placeholder-shown:bg-transparent peer-placeholder-shown:px-0 peer-focus:-top-2.5 peer-focus:left-2.5 peer-focus:text-xs peer-focus:bg-white peer-focus:px-1 peer-focus:text-blue-600"
                              >
                                State
                              </label>
                            </div>
                          </div>
                          {/* Action buttons */}
                          <div className="flex gap-2 pt-1">
                            <button type="button" onClick={() => saveAddress(idx)}
                              disabled={isSaving}
                              className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 font-medium disabled:opacity-60 disabled:cursor-not-allowed">
                              {isSaving ? "Saving..." : "Save Address"}
                            </button>
                            <button type="button"
                              onClick={() => {
                                if (!customer) return;
                                const current = customer.addresses[idx];
                                if (current && current.addressId === 0) {
                                  const updatedAddresses = customer.addresses.filter((_, i) => i !== idx);
                                  setCustomer({ ...customer, addresses: updatedAddresses });
                                  setOriginalAddresses(prev => prev.filter((_, i) => i !== idx));
                                  setAddressErrors(prev => { const next = [...prev]; next.splice(idx, 1); return next; });
                                  setEditingAddressIndex(null);
                                  return;
                                }
                                const original = originalAddresses[idx];
                                if (!original) { setEditingAddressIndex(null); return; }
                                setCustomer({ ...customer, addresses: customer.addresses.map((a, i) => i === idx ? { ...original } : a) });
                                setAddressErrors(prev => { const next = [...prev]; next[idx] = {}; return next; });
                                setEditingAddressIndex(null);
                              }}
                              className="px-4 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 font-medium">
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* View mode */
                        <div className="text-sm">
                          {/* Three-dot menu */}
                          <button
                            type="button"
                            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-700 hover:text-gray-900 text-2xl font-black leading-none"
                            onClick={() => setAddressMenuOpenIndex(addressMenuOpenIndex === idx ? null : idx)}
                          >
                            &#8942;
                          </button>
                          {addressMenuOpenIndex === idx && (
                            <div className="absolute top-10 right-3 z-10 w-28 rounded-lg border border-gray-100 bg-white shadow-lg text-xs overflow-hidden"
                              onMouseLeave={() => setAddressMenuOpenIndex(null)}>
                              <button type="button"
                                onClick={() => { setEditingAddressIndex(idx); setAddressMenuOpenIndex(null); }}
                                className="block w-full px-3 py-2 text-left text-gray-700 hover:bg-gray-50">Edit</button>
                              {customer.addresses.length > 1 && (
                                <button type="button"
                                  onClick={() => { removeAddress(addr.addressId); setAddressMenuOpenIndex(null); }}
                                  className="block w-full px-3 py-2 text-left text-red-500 hover:bg-red-50">Delete</button>
                              )}
                            </div>
                          )}
                          <p className="font-semibold text-gray-900 pr-8">{addr.recipientName || "(No name)"}{addr.contactNumber ? ` · ${addr.contactNumber}` : ""}</p>
                          <p className="text-gray-600 mt-1">
                            {[addr.addressLine1, addr.addressLine2, addr.landMark].filter(Boolean).join(", ")}
                          </p>
                          <p className="text-gray-600">
                            {[addr.city, addr.state].filter(Boolean).join(", ")}{addr.postalCode ? ` – ${addr.postalCode}` : ""}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {(customer.addresses || []).length < 4 && (
                  <button
                    type="button"
                    onClick={addAddress}
                    className="mt-5 w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-blue-300 py-3 text-sm font-semibold text-blue-600 hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Add New Address
                  </button>
                )}
              </div>
            )}

          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
