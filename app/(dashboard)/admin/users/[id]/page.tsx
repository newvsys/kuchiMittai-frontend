"use client";

import { DashboardSidebar } from "@/components";
import apiClient from "@/lib/api";
import Link from "next/link";
import React, { use, useEffect, useState } from "react";
import { showToast, showError } from "@/lib/toast";

interface Address {
  addressId: number;
  addressType: string;
  recipientName: string;
  addressLine1: string;
  addressLine2: string | null;
  landMark: string | null;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  contactNumber: string;
}

interface AdminUser {
  userId: number;
  email: string;
  phone: string;
  firstName: string;
  role: string;
  status: string;
  phoneVerified: string;
  phoneVerifiedAt: string | null;
  userCreatedAt: string;
  userUpdatedAt: string;
  lastLoginAt: string | null;
  customerId: number;
  customerFirstName: string;
  customerLastName: string;
  customerEmail: string;
  mobileNumber: string;
  customerType: string;
  customerStatus: string;
  customerCreatedAt: string;
  customerUpdatedAt: string;
  addresses: Address[];
}

interface DashboardUserDetailsProps {
  params: Promise<{ id: string }>;
}

const InfoRow = ({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) => (
  <div className="flex items-start gap-2">
    <span className="text-gray-500 min-w-[150px] shrink-0">{label}:</span>
    <span className="font-medium">{value ?? "—"}</span>
  </div>
);

const DashboardSingleUserPage = ({ params }: DashboardUserDetailsProps) => {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(false);

  useEffect(() => {
    apiClient
      .get(`/user/admin/users/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.userId) {
          setUser(data);
        } else {
          showError("User not found");
        }
      })
      .catch(() => showError("Error fetching user details"))
      .finally(() => setLoading(false));
  }, [id]);

  const toggleStatus = async () => {
    if (!user) return;
    const isActive = user.status === "ACTIVE" || user.status === "A";
    const newStatusCode = isActive ? "I" : "A";
    const newStatusLabel = isActive ? "INACTIVE" : "ACTIVE";
    setStatusLoading(true);
    try {
      const res = await apiClient.put(
        `/user/admin/users/${id}/status?status=${newStatusCode}`
      );
      const data = await res.json();
      if (data.responseStatus === "SUCCESS") {
        showToast(data.responseMessage || `Status updated to ${newStatusLabel}`);
        setUser({ ...user, status: newStatusLabel });
      } else {
        showError(data.responseMessage || "Failed to update status");
      }
    } catch {
      showError("Error updating user status");
    } finally {
      setStatusLoading(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  if (loading) {
    return (
      <div className="bg-white flex flex-col min-h-screen max-w-screen-2xl mx-auto">
        <DashboardSidebar />
        <div className="flex justify-center items-center flex-1">
          <span className="loading loading-spinner loading-lg" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-white flex flex-col min-h-screen max-w-screen-2xl mx-auto">
        <DashboardSidebar />
        <div className="flex-1 p-6">
          <Link href="/admin/users" className="btn btn-ghost btn-sm mb-4">
            ← Back to Users
          </Link>
          <p className="text-gray-500">User not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white flex flex-col min-h-screen max-w-screen-2xl mx-auto">
      <DashboardSidebar />
      <div className="flex-1 p-6 w-full">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <Link
              href="/admin/users"
              className="text-sm text-blue-600 hover:underline"
            >
              ← Back to Users
            </Link>
            <h1 className="text-2xl font-bold mt-1">
              {user.customerFirstName} {user.customerLastName}
            </h1>
            <p className="text-gray-500 text-sm">User ID: {user.userId}</p>
          </div>
          <button
            className={`btn btn-sm ${
              user.status === "ACTIVE" || user.status === "A" ? "btn-error" : "btn-success"
            }`}
            onClick={toggleStatus}
            disabled={statusLoading}
          >
            {statusLoading
              ? "Updating..."
              : user.status === "ACTIVE" || user.status === "A"
              ? "Deactivate User"
              : "Activate User"}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Account Information */}
          <div className="border border-gray-200 rounded-lg p-5">
            <h2 className="text-lg font-semibold mb-4 text-gray-700">
              Account Information
            </h2>
            <div className="space-y-3 text-sm">
              <InfoRow label="Email" value={user.email} />
              <InfoRow label="Phone" value={user.phone} />
              <InfoRow label="First Name" value={user.firstName} />
              <InfoRow
                label="Role"
                value={
                  <span className="badge badge-ghost badge-sm">{user.role}</span>
                }
              />
              <InfoRow
                label="Status"
                value={
                  <span
                    className={`badge badge-sm text-white ${
                      user.status === "ACTIVE" || user.status === "A" ? "badge-success" : "badge-error"
                    }`}
                  >
                    {user.status}
                  </span>
                }
              />
              <InfoRow
                label="Phone Verified"
                value={
                  <span
                    className={`badge badge-sm text-white ${
                      user.phoneVerified === "YES"
                        ? "badge-success"
                        : "badge-warning"
                    }`}
                  >
                    {user.phoneVerified}
                  </span>
                }
              />
              <InfoRow
                label="Phone Verified At"
                value={formatDate(user.phoneVerifiedAt)}
              />
              <InfoRow label="Last Login" value={formatDate(user.lastLoginAt)} />
              <InfoRow
                label="Created At"
                value={formatDate(user.userCreatedAt)}
              />
              <InfoRow
                label="Updated At"
                value={formatDate(user.userUpdatedAt)}
              />
            </div>
          </div>

          {/* Customer Information */}
          <div className="border border-gray-200 rounded-lg p-5">
            <h2 className="text-lg font-semibold mb-4 text-gray-700">
              Customer Information
            </h2>
            <div className="space-y-3 text-sm">
              <InfoRow label="Customer ID" value={user.customerId} />
              <InfoRow
                label="Full Name"
                value={`${user.customerFirstName} ${user.customerLastName}`}
              />
              <InfoRow label="Email" value={user.customerEmail} />
              <InfoRow label="Mobile" value={user.mobileNumber} />
              <InfoRow
                label="Customer Type"
                value={
                  <span className="badge badge-ghost badge-sm">
                    {user.customerType}
                  </span>
                }
              />
              <InfoRow
                label="Customer Status"
                value={
                  <span
                    className={`badge badge-sm text-white ${
                      user.customerStatus === "ACTIVE" || user.customerStatus === "A"
                        ? "badge-success"
                        : "badge-error"
                    }`}
                  >
                    {user.customerStatus}
                  </span>
                }
              />
              <InfoRow
                label="Customer Since"
                value={formatDate(user.customerCreatedAt)}
              />
              <InfoRow
                label="Customer Updated"
                value={formatDate(user.customerUpdatedAt)}
              />
            </div>
          </div>
        </div>

        {/* Addresses */}
        <div className="mt-6 border border-gray-200 rounded-lg p-5">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">
            Addresses ({user.addresses?.length ?? 0})
          </h2>
          {!user.addresses || user.addresses.length === 0 ? (
            <p className="text-gray-400 text-sm">No addresses on file.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {user.addresses.map((addr) => (
                <div
                  key={addr.addressId}
                  className="border border-gray-100 rounded-md p-4 bg-gray-50 text-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="badge badge-outline badge-sm">
                      {addr.addressType}
                    </span>
                    <span className="text-xs text-gray-400">
                      #{addr.addressId}
                    </span>
                  </div>
                  <p className="font-medium">{addr.recipientName}</p>
                  <p className="text-gray-600">{addr.addressLine1}</p>
                  {addr.addressLine2 && (
                    <p className="text-gray-600">{addr.addressLine2}</p>
                  )}
                  {addr.landMark && (
                    <p className="text-gray-500 text-xs">
                      Near: {addr.landMark}
                    </p>
                  )}
                  <p className="text-gray-600">
                    {addr.city}, {addr.state} — {addr.postalCode}
                  </p>
                  <p className="text-gray-600">{addr.country}</p>
                  <p className="text-gray-500 text-xs mt-1">
                    Ph: {addr.contactNumber}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardSingleUserPage;
