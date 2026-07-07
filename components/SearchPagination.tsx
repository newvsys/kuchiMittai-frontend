"use client";

import React, { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface SearchPaginationProps {
  totalPages: number;
}

const SearchPagination: React.FC<SearchPaginationProps> = ({ totalPages }) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentPage = Number(searchParams.get("page") || "1") || 1;

  if (!totalPages || totalPages <= 1) {
    // Only one (or zero) pages: hide prev/next completely
    return null;
  }

  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  const updatePage = (page: number) => {
    if (page < 1 || page > totalPages) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  };

  // Build page number list with ellipsis
  const pages: (number | null)[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push(null);
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push(null);
    pages.push(totalPages);
  }

  return (
    <div className="flex justify-center items-center gap-2 py-10">
      <button
        className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        onClick={() => updatePage(currentPage - 1)}
        disabled={!canGoPrev || isPending}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Prev
      </button>
      {pages.map((p, i) =>
        p === null ? (
          <span key={`dots-${i}`} className="px-2 text-gray-400 text-sm select-none">…</span>
        ) : (
          <button
            key={p}
            onClick={() => updatePage(p)}
            disabled={isPending}
            className={`w-9 h-9 rounded-xl border text-sm font-medium transition-colors disabled:opacity-60 ${
              p === currentPage
                ? "bg-blue-600 text-white border-blue-600"
                : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            {p}
          </button>
        )
      )}
      <button
        className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        onClick={() => updatePage(currentPage + 1)}
        disabled={!canGoNext || isPending}
      >
        Next
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
};

export default SearchPagination;
