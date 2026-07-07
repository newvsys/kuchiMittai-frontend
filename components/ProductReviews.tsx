"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

interface Review {
  id: number;
  productId: number;
  customerId: number | null;
  customerName: string;
  rating: number;
  title: string | null;
  reviewText: string | null;
  status: string;
  imageUrls: string[];
  createdAt: string;
}

interface ReviewSummary {
  productId: number;
  averageRating: number;
  totalReviews: number;
  ratingDistribution: Record<string, number>;
  reviews: Review[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const StarRating = ({
  value,
  onChange,
}: {
  value: number;
  onChange?: (v: number) => void;
}) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((star) => (
      <button
        key={star}
        type="button"
        onClick={() => onChange?.(star)}
        className={`text-2xl leading-none ${
          star <= value ? "text-yellow-400" : "text-gray-300"
        } ${onChange ? "cursor-pointer hover:text-yellow-300" : "cursor-default"}`}
        aria-label={`${star} star`}
      >
        ★
      </button>
    ))}
  </div>
);

const StarDisplay = ({ rating }: { rating: number }) => (
  <span className="flex gap-0.5 text-sm leading-none">
    {[1, 2, 3, 4, 5].map((s) => (
      <span key={s} className={s <= rating ? "text-yellow-400" : "text-gray-300"}>
        ★
      </span>
    ))}
  </span>
);

const ReviewCard = ({ review }: { review: Review }) => (
  <div className="border rounded-xl p-5 bg-white shadow-sm">
    <div className="flex items-start gap-4 flex-wrap">
      <div>
        <div className="flex items-center gap-2">
          <StarDisplay rating={review.rating} />
          {review.title && (
            <span className="font-semibold text-gray-900 text-sm">{review.title}</span>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-0.5">
          {review.customerName} &mdash;{" "}
          {new Date(review.createdAt).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </p>
      </div>
    </div>
    {review.reviewText && (
      <p className="mt-3 text-sm text-gray-700 leading-relaxed">{review.reviewText}</p>
    )}
    {review.imageUrls && review.imageUrls.length > 0 && (
      <div className="flex flex-wrap gap-2 mt-3">
        {review.imageUrls.map((url, i) => (
          <a key={i} href={url} target="_blank" rel="noopener noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`Review image ${i + 1}`}
              className="w-20 h-20 object-cover rounded border"
            />
          </a>
        ))}
      </div>
    )}
  </div>
);

// ── Config ────────────────────────────────────────────────────────────────────

import { API_BASE_PLAIN } from "@/lib/env";

const API_BASE = API_BASE_PLAIN;
const PREVIEW_COUNT = 5;
const PAGE_SIZE = 15;

// ── Component ─────────────────────────────────────────────────────────────────

const ProductReviews = ({ productId }: { productId: number }) => {
  const { data: session, status } = useSession();
  const isLoggedIn = status === "authenticated";
  const customerId = (session as any)?.user?.id ?? null;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [form, setForm] = useState({ rating: 0, title: "", reviewText: "" });
  const [formError, setFormError] = useState<string | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  // Show-all modal
  const [showAllModal, setShowAllModal] = useState(false);
  const [modalPage, setModalPage] = useState(1);
  const [reviewPopupOpen, setReviewPopupOpen] = useState(false);

  const MAX_IMAGES = 3;
  const MAX_SIZE_MB = 2;

  // ── Data ──────────────────────────────────────────────────────────────────

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/reviews/product/${productId}`);
      if (res.ok) {
        const data: ReviewSummary = await res.json();
        setSummary(data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (productId) fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const allReviews = summary?.reviews ?? [];
  const hasReviewed = isLoggedIn && customerId != null && allReviews.some((r) => r.customerId === customerId);

  // Auto-open review popup when redirected back after login (only if not already reviewed)
  useEffect(() => {
    if (isLoggedIn && !hasReviewed && searchParams.get("openReview") === "true") {
      setSubmitSuccess(false);
      setFormError(null);
      setSubmitError(null);
      setReviewPopupOpen(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, hasReviewed, searchParams]);

  // ── Image handlers ────────────────────────────────────────────────────────

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const valid = files.filter(
      (f) => f.type.startsWith("image/") && f.size <= MAX_SIZE_MB * 1024 * 1024
    );
    const combined = [...imageFiles, ...valid].slice(0, MAX_IMAGES);
    setImageFiles(combined);
    setImagePreviews(combined.map((f) => URL.createObjectURL(f)));
    e.target.value = "";
  };

  const removeImage = (idx: number) => {
    const updated = imageFiles.filter((_, i) => i !== idx);
    setImageFiles(updated);
    setImagePreviews(updated.map((f) => URL.createObjectURL(f)));
  };

  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  // ── Submit review ─────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (form.rating === 0) {
      setFormError("Please select a star rating.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const uploadedUrls = await Promise.all(imageFiles.map(toBase64));
      const res = await fetch(`${API_BASE}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          customerId,
          rating: form.rating,
          title: form.title || null,
          reviewText: form.reviewText || null,
          imageUrls: uploadedUrls,
        }),
      });
      if (res.ok) {
        setSubmitSuccess(true);
        setForm({ rating: 0, title: "", reviewText: "" });
        setImageFiles([]);
        setImagePreviews([]);
        setTimeout(() => {
          setReviewPopupOpen(false);
          setSubmitSuccess(false);
        }, 2500);
      } else {
        setSubmitError("Failed to submit review. Please try again.");
      }
    } catch {
      setSubmitError("Failed to submit review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Derived values ────────────────────────────────────────────────────────

  const dist = summary?.ratingDistribution ?? {};
  const total = summary?.totalReviews ?? 0;
  const previewReviews = allReviews.slice(0, PREVIEW_COUNT);
  const totalModalPages = Math.max(1, Math.ceil(allReviews.length / PAGE_SIZE));
  const modalReviews = allReviews.slice(
    (modalPage - 1) * PAGE_SIZE,
    modalPage * PAGE_SIZE
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-10">

      {/* ── Show-all reviews modal ───────────────────────────────────────── */}
      {showAllModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowAllModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* header */}
            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
              <h2 className="text-lg font-bold text-gray-900">
                All Reviews{" "}
                <span className="text-gray-400 font-normal text-base">
                  ({allReviews.length})
                </span>
              </h2>
              <button
                type="button"
                className="btn btn-sm btn-ghost btn-circle text-lg"
                onClick={() => setShowAllModal(false)}
              >
                ✕
              </button>
            </div>

            {/* body */}
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
              {modalReviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>

            {/* pagination */}
            {totalModalPages > 1 && (
              <div className="border-t px-6 py-3 flex items-center justify-between shrink-0 flex-wrap gap-2">
                <span className="text-sm text-gray-500">
                  Page {modalPage} of {totalModalPages}
                </span>
                <div className="flex gap-1 flex-wrap">
                  <button
                    type="button"
                    disabled={modalPage === 1}
                    onClick={() => setModalPage((p) => p - 1)}
                    className="btn btn-sm btn-outline"
                  >
                    ‹ Prev
                  </button>
                  {Array.from({ length: totalModalPages }, (_, i) => i + 1).map((pg) => (
                    <button
                      key={pg}
                      type="button"
                      onClick={() => setModalPage(pg)}
                      className={`btn btn-sm ${
                        modalPage === pg ? "btn-primary" : "btn-outline"
                      }`}
                    >
                      {pg}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={modalPage === totalModalPages}
                    onClick={() => setModalPage((p) => p + 1)}
                    className="btn btn-sm btn-outline"
                  >
                    Next ›
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Write a Review link ──────────────────────────────────────────── */}
      <div className="flex justify-end mb-2">
        {isLoggedIn ? (
          hasReviewed ? (
            <span className="text-sm text-gray-500 italic">You have already reviewed this product</span>
          ) : (
            <button
              type="button"
              onClick={() => { setSubmitSuccess(false); setFormError(null); setSubmitError(null); setReviewPopupOpen(true); }}
              className="text-sm font-medium text-blue-600 hover:underline"
            >
              ✏ Write a Review
            </button>
          )
        ) : (
          <button
            type="button"
            onClick={() => router.push(`/login?callbackUrl=${encodeURIComponent(pathname + "?openReview=true")}`)}
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            Login to write a review
          </button>
        )}
      </div>

      {/* ── Write a Review popup ─────────────────────────────────────────── */}
      {reviewPopupOpen && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setReviewPopupOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-blue-500 border-b border-blue-600 shrink-0">
              <h3 className="text-base font-bold text-white">Write a Review</h3>
              <button
                type="button"
                className="text-white/80 hover:text-white text-3xl leading-none font-light"
                onClick={() => setReviewPopupOpen(false)}
              >
                &times;
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 px-6 py-5">
              {submitSuccess ? (
                <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-4 text-sm text-center">
                  ✓ Thank you! Your review has been submitted and is pending approval.
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Rating <span className="text-red-500">*</span>
                    </label>
                    <StarRating
                      value={form.rating}
                      onChange={(v) => setForm((f) => ({ ...f, rating: v }))}
                    />
                    {formError && (
                      <p className="text-red-500 text-xs mt-1">{formError}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                      placeholder="Summarise your experience"
                      className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                      maxLength={120}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Review</label>
                    <textarea
                      value={form.reviewText}
                      onChange={(e) => setForm((f) => ({ ...f, reviewText: e.target.value }))}
                      placeholder="Share your thoughts about the product..."
                      className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                      rows={4}
                      maxLength={1000}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Photos{" "}
                      <span className="text-gray-400 font-normal">
                        (optional, up to {MAX_IMAGES}, max {MAX_SIZE_MB}MB each)
                      </span>
                    </label>
                    <div className="flex flex-wrap gap-3 mt-1">
                      {imagePreviews.map((src, idx) => (
                        <div key={idx} className="relative w-20 h-20 rounded border overflow-hidden group">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={src} alt={`preview ${idx + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeImage(idx)}
                            className="absolute inset-0 bg-black/50 text-white text-lg opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                            aria-label="Remove image"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      {imageFiles.length < MAX_IMAGES && (
                        <label className="w-20 h-20 rounded border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors text-gray-400 text-xs gap-1">
                          <span className="text-2xl leading-none">+</span>
                          <span>Add photo</span>
                          <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageChange} />
                        </label>
                      )}
                    </div>
                  </div>
                  {submitError && <p className="text-red-500 text-sm">{submitError}</p>}
                  <div className="flex justify-end gap-3 pt-1">
                    <button
                      type="button"
                      className="px-4 py-1.5 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
                      onClick={() => setReviewPopupOpen(false)}
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                      {submitting ? "Submitting..." : "Submit Review"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {!loading && summary && total > 0 && (
        <div className="flex flex-wrap gap-8 items-start bg-gray-50 rounded-xl p-6">
          <div className="flex flex-col items-center min-w-[100px]">
            <span className="text-5xl font-bold text-gray-900">
              {summary.averageRating.toFixed(1)}
            </span>
            <StarDisplay rating={Math.round(summary.averageRating)} />
            <span className="text-sm text-gray-500 mt-1">
              {total} review{total !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex-1 min-w-[200px] space-y-1.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = dist[String(star)] ?? 0;
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={star} className="flex items-center gap-2 text-sm">
                  <span className="w-4 text-right text-gray-600">{star}</span>
                  <span className="text-yellow-400 text-xs">★</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-yellow-400 h-2 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-gray-500">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Reviews list — latest 5 ──────────────────────────────────────── */}
      {loading ? (
        <div className="flex justify-center py-8">
          <span className="loading loading-spinner loading-md text-gray-400" />
        </div>
      ) : previewReviews.length > 0 ? (
        <div className="space-y-5">
          <h3 className="text-base font-semibold text-gray-700">Latest Reviews</h3>
          {previewReviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
          {allReviews.length > PREVIEW_COUNT && (
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setModalPage(1);
                  setShowAllModal(true);
                }}
                className="text-blue-600 hover:underline text-sm font-medium"
              >
                Show all reviews ({allReviews.length}) →
              </button>
            </div>
          )}
        </div>
      ) : !loading ? (
        <p className="text-gray-400 text-sm text-center py-4">
          No reviews yet. Be the first to review!
        </p>
      ) : null}

      {/* ── Write a Review (inline section removed — now a popup) ─────── */}
    </div>
  );
};

export default ProductReviews;
