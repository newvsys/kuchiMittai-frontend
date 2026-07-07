"use client";

import React, { useEffect, useState } from "react";
import apiClient from "@/lib/api";

interface Review {
  id: number;
  productId: number;
  productName: string | null;
  customerId: number | null;
  customerName: string;
  rating: number;
  title: string | null;
  reviewText: string | null;
  status: string;
  imageUrls: string[];
  createdAt: string;
  updatedAt: string;
}

interface ReviewListResponse {
  productId: number | null;
  averageRating: number | null;
  totalReviews: number;
  reviews: Review[];
}

const STATUS_OPTIONS = ["PENDING", "APPROVED", "REJECTED"];

function getStatusBadgeClass(status: string) {
  switch (status) {
    case "APPROVED":
      return "badge-success text-white";
    case "REJECTED":
      return "badge-error text-white";
    case "PENDING":
    default:
      return "badge-warning";
  }
}

const StarDisplay = ({ rating }: { rating: number }) => (
  <span className="flex gap-0.5 text-sm">
    {[1, 2, 3, 4, 5].map((s) => (
      <span key={s} className={s <= rating ? "text-yellow-400" : "text-gray-300"}>
        ★
      </span>
    ))}
  </span>
);

import { API_BASE_PLAIN } from "@/lib/env";

const PRODUCT_API_BASE = API_BASE_PLAIN;

const AdminReviews = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("PENDING");
  const [productNameFilter, setProductNameFilter] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [viewReview, setViewReview] = useState<Review | null>(null);

  const fetchReviews = async (status: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${PRODUCT_API_BASE}/reviews/status/${status}`);
      if (!res.ok) throw new Error("Failed to fetch reviews");
      const data: ReviewListResponse = await res.json();
      const list = data.reviews ?? [];
      setReviews(list);
    } catch (e: any) {
      setError(e.message ?? "Failed to fetch reviews");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews(filterStatus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus]);

  const updateStatus = async (reviewId: number, newStatus: string) => {
    setUpdatingId(reviewId);
    try {
      const res = await fetch(
        `${PRODUCT_API_BASE}/reviews/${reviewId}/status?status=${newStatus}`,
        { method: "PATCH" }
      );
      if (!res.ok) throw new Error("Update failed");
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    } catch {
      alert("Failed to update review status.");
    } finally {
      setUpdatingId(null);
    }
  };

  const deleteReview = async (reviewId: number) => {
    if (!confirm("Permanently delete this review?")) return;
    setDeletingId(reviewId);
    try {
      const res = await fetch(`${PRODUCT_API_BASE}/reviews/${reviewId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    } catch {
      alert("Failed to delete review.");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredReviews = productNameFilter.trim()
    ? reviews.filter((r) =>
        (r.productName ?? "").toLowerCase().includes(productNameFilter.toLowerCase())
      )
    : reviews;

  return (
    <div className="xl:ml-5 w-full max-xl:mt-5 p-4">
      <h1 className="text-3xl font-semibold text-center mb-6">Reviews &amp; Ratings</h1>

      {/* View Detail Modal */}
      {viewReview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setViewReview(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-bold">Review #{viewReview.id}</h2>
              <button
                className="btn btn-sm btn-ghost btn-circle text-lg"
                onClick={() => setViewReview(null)}
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase mb-0.5">Product</p>
                  <p className="font-semibold">{viewReview.productName ?? `Product #${viewReview.productId}`}</p>
                  <p className="text-xs text-gray-400">ID: {viewReview.productId}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase mb-0.5">Customer</p>
                  <p className="font-semibold">{viewReview.customerName}</p>
                  {viewReview.customerId && (
                    <p className="text-xs text-gray-400">ID: {viewReview.customerId}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase mb-0.5">Rating</p>
                  <div className="flex items-center gap-2">
                    <StarDisplay rating={viewReview.rating} />
                    <span className="text-sm text-gray-600">{viewReview.rating}/5</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase mb-0.5">Status</p>
                  <span className={`badge badge-sm ${getStatusBadgeClass(viewReview.status)}`}>
                    {viewReview.status}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase mb-0.5">Submitted</p>
                  <p>{new Date(viewReview.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase mb-0.5">Last Updated</p>
                  <p>{new Date(viewReview.updatedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
                </div>
              </div>
              {viewReview.title && (
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase mb-1">Title</p>
                  <p className="font-semibold text-gray-900">{viewReview.title}</p>
                </div>
              )}
              {viewReview.reviewText && (
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase mb-1">Review</p>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{viewReview.reviewText}</p>
                </div>
              )}
              {viewReview.imageUrls && viewReview.imageUrls.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase mb-2">Images</p>
                  <div className="flex flex-wrap gap-3">
                    {viewReview.imageUrls.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={`Review image ${i + 1}`}
                          className="w-24 h-24 object-cover rounded-lg border hover:opacity-90 transition-opacity"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {/* Status action buttons */}
              <div className="pt-2 border-t flex flex-wrap gap-2">
                {viewReview.status !== "APPROVED" && (
                  <button
                    type="button"
                    disabled={updatingId === viewReview.id}
                    onClick={() => { updateStatus(viewReview.id, "APPROVED"); setViewReview(null); }}
                    className="btn btn-sm bg-green-600 hover:bg-green-700 text-white border-none"
                  >
                    Approve
                  </button>
                )}
                {viewReview.status !== "REJECTED" && (
                  <button
                    type="button"
                    disabled={updatingId === viewReview.id}
                    onClick={() => { updateStatus(viewReview.id, "REJECTED"); setViewReview(null); }}
                    className="btn btn-sm bg-red-500 hover:bg-red-600 text-white border-none"
                  >
                    Reject
                  </button>
                )}
                {viewReview.status !== "PENDING" && (
                  <button
                    type="button"
                    disabled={updatingId === viewReview.id}
                    onClick={() => { updateStatus(viewReview.id, "PENDING"); setViewReview(null); }}
                    className="btn btn-sm btn-outline"
                  >
                    Set Pending
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Filter */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <span className="text-sm font-medium text-gray-600">Filter by status:</span>
        <div className="flex gap-2">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilterStatus(s)}
              className={`btn btn-sm ${
                filterStatus === s ? "btn-primary" : "btn-outline"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={productNameFilter}
          onChange={(e) => setProductNameFilter(e.target.value)}
          placeholder="Filter by product name..."
          className="input input-bordered input-sm w-56"
        />
        <span className="ml-auto text-sm text-gray-500">
          {filteredReviews.length} review{filteredReviews.length !== 1 ? "s" : ""}
        </span>
      </div>

      {error && (
        <div className="alert alert-error mb-4">
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center my-10">
          <span className="loading loading-spinner loading-lg" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          No <span className="font-semibold lowercase">{filterStatus}</span> reviews found.
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          No reviews match &ldquo;{productNameFilter}&rdquo;.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-sm w-full">
            <thead className="bg-gray-100">
              <tr>
                <th>ID</th>
                <th>Product</th>
                <th>Customer</th>
                <th>Rating</th>
                <th>Title</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReviews.map((review) => (
                <React.Fragment key={review.id}>
                  <tr className="hover:bg-gray-50 border-b">
                    <td className="font-mono text-xs">{review.id}</td>
                    <td>
                      <div className="font-medium text-sm">
                        {review.productName ?? `Product #${review.productId}`}
                      </div>
                      <div className="text-xs text-gray-400">ID: {review.productId}</div>
                    </td>
                    <td>
                      <div className="font-medium text-sm">{review.customerName}</div>
                      {review.customerId && (
                        <div className="text-xs text-gray-400">ID: {review.customerId}</div>
                      )}
                    </td>
                    <td>
                      <StarDisplay rating={review.rating} />
                      <span className="text-xs text-gray-500">{review.rating}/5</span>
                    </td>
                    <td className="max-w-xs">
                      {review.title ? (
                        <div className="font-semibold text-sm truncate">{review.title}</div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge badge-sm ${getStatusBadgeClass(review.status)}`}>
                        {review.status}
                      </span>
                    </td>
                    <td className="text-xs text-gray-500 whitespace-nowrap">
                      {new Date(review.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td>
                      <div className="flex flex-col gap-1 min-w-[120px]">
                        <button
                          type="button"
                          onClick={() => setViewReview(review)}
                          className="btn btn-xs btn-outline"
                        >
                          View
                        </button>
                        {review.status !== "APPROVED" && (
                          <button
                            type="button"
                            disabled={updatingId === review.id}
                            onClick={() => updateStatus(review.id, "APPROVED")}
                            className="btn btn-xs bg-green-600 hover:bg-green-700 text-white border-none"
                          >
                            {updatingId === review.id ? "..." : "Approve"}
                          </button>
                        )}
                        {review.status !== "REJECTED" && (
                          <button
                            type="button"
                            disabled={updatingId === review.id}
                            onClick={() => updateStatus(review.id, "REJECTED")}
                            className="btn btn-xs bg-red-500 hover:bg-red-600 text-white border-none"
                          >
                            {updatingId === review.id ? "..." : "Reject"}
                          </button>
                        )}
                        {review.status !== "PENDING" && (
                          <button
                            type="button"
                            disabled={updatingId === review.id}
                            onClick={() => updateStatus(review.id, "PENDING")}
                            className="btn btn-xs btn-outline"
                          >
                            {updatingId === review.id ? "..." : "Set Pending"}
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={deletingId === review.id}
                          onClick={() => deleteReview(review.id)}
                          className="btn btn-xs btn-ghost text-red-500 hover:bg-red-50"
                        >
                          {deletingId === review.id ? "..." : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminReviews;
