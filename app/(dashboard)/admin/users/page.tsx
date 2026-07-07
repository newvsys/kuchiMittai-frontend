"use client";

import { DashboardSidebar } from "@/components";
import apiClient from "@/lib/api";
import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";
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

const PAGE_SIZE = 10;

const DashboardUsers = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const fetchUsers = useCallback(
    async (searchVal: string, status: string, pageNum: number) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (searchVal.trim()) params.append("search", searchVal.trim());
        if (status) params.append("status", status);
        params.append("page", String(pageNum));
        params.append("size", String(PAGE_SIZE));

        const res = await apiClient.get(`/user/admin/users?${params.toString()}`);
        const data = await res.json();

        if (data.responseStatus === "SUCCESS") {
          setUsers(data.users || []);
          setTotalPages(data.totalPages || 0);
          setTotalCount(data.totalCount || 0);
        } else {
          showError(data.responseMessage || "Failed to fetch users");
          setUsers([]);
        }
      } catch {
        showError("Error fetching users");
        setUsers([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchUsers(search, statusFilter, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleSearch = () => {
    setPage(0);
    fetchUsers(search, statusFilter, 0);
  };

  const handleReset = () => {
    setSearch("");
    setStatusFilter("");
    setPage(0);
    fetchUsers("", "", 0);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "â€”";
    return new Date(dateStr).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  return (
    <div className="bg-white flex flex-col min-h-screen max-w-screen-2xl mx-auto">
      <DashboardSidebar />
      <div className="flex-1 p-6 w-full">
        <h1 className="text-2xl font-bold mb-6">Users</h1>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-600">Search</label>
            <input
              type="text"
              placeholder="Name, email, or phone"
              className="input input-bordered w-64"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-600">Status</label>
            <select
              className="select select-bordered"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All</option>
              <option value="A">Active</option>
              <option value="I">Inactive</option>
            </select>
          </div>
          <button className="btn btn-primary" onClick={handleSearch}>
            Search
          </button>
          <button className="btn btn-outline" onClick={handleReset}>
            Reset
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <span className="loading loading-spinner loading-lg" />
          </div>
        ) : (
          <>
            <div className="text-sm text-gray-500 mb-3">
              Total: {totalCount} user{totalCount !== 1 ? "s" : ""}
            </div>

            <div className="overflow-auto rounded-lg border border-gray-200">
              <table className="table table-md w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Phone Verified</th>
                    <th>Last Login</th>
                    <th>Joined</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-10 text-gray-400">
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.userId} className="hover">
                        <td className="font-mono text-xs text-gray-400">{user.userId}</td>
                        <td>
                          <div className="font-medium">
                            {user.customerFirstName} {user.customerLastName}
                          </div>
                          <div className="text-xs text-gray-400">{user.customerType}</div>
                        </td>
                        <td>{user.email}</td>
                        <td>{user.phone || user.mobileNumber || "â€”"}</td>
                        <td>
                          <span className="badge badge-ghost badge-sm">{user.role}</span>
                        </td>
                        <td>
                          <span
                            className={`badge badge-sm text-white ${
                              user.status === "ACTIVE" || user.status === "A" ? "badge-success" : "badge-error"
                            }`}
                          >
                            {user.status}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`badge badge-sm text-white ${
                              user.phoneVerified === "YES"
                                ? "badge-success"
                                : "badge-error"
                            }`}
                          >
                            {user.phoneVerified === "YES" ? "Yes" : "No"}
                          </span>
                        </td>
                        <td className="text-xs whitespace-nowrap">
                          {formatDate(user.lastLoginAt)}
                        </td>
                        <td className="text-xs whitespace-nowrap">
                          {formatDate(user.userCreatedAt)}
                        </td>
                        <td>
                          <Link
                            href={`/admin/users/${user.userId}`}
                            className="btn btn-ghost btn-xs"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-6 gap-2 items-center">
                <button
                  className="btn btn-sm btn-outline"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </button>
                <span className="text-sm px-3">
                  Page {page + 1} of {totalPages}
                </span>
                <button
                  className="btn btn-sm btn-outline"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default DashboardUsers;
