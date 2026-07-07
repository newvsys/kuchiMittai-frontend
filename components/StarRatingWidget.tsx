"use client";

import React, { useState } from "react";

const BAR_COLORS = [
  "bg-green-500",  // 5★
  "bg-lime-400",   // 4★
  "bg-yellow-400", // 3★
  "bg-orange-400", // 2★
  "bg-red-500",    // 1★
];

function RatingPopup({
  rating,
  total,
  distribution,
}: {
  rating: number;
  total: number;
  distribution: Record<string, number>;
}) {
  const maxCount = Math.max(
    1,
    ...[5, 4, 3, 2, 1].map((s) => distribution[String(s)] ?? 0)
  );

  return (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-52 bg-white border border-gray-200 rounded-xl shadow-xl p-3 pointer-events-none">
      {/* arrow */}
      <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-white drop-shadow-sm" />

      <p className="text-center text-sm font-semibold text-gray-700 mb-2">
        {rating.toFixed(1)} ★{" "}
        <span className="text-gray-400 font-normal text-xs">({total} reviews)</span>
      </p>

      <div className="space-y-1">
        {[5, 4, 3, 2, 1].map((star, idx) => {
          const count = distribution[String(star)] ?? 0;
          const pct = Math.round((count / maxCount) * 100);
          return (
            <div key={star} className="flex items-center gap-2 text-xs">
              <span className="w-5 text-right text-gray-600 font-medium shrink-0">
                {star}★
              </span>
              <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className={`${BAR_COLORS[idx]} h-2 rounded-full transition-all`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-8 text-gray-500 shrink-0">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export interface StarRatingProps {
  rating: number;
  total: number;
  distribution?: Record<string, number>;
  /** Extra Tailwind classes for the wrapper */
  className?: string;
  /** Size variant: "sm" (default) or "lg" */
  size?: "sm" | "lg";
}

export function StarRatingWidget({
  rating,
  total,
  distribution,
  className = "",
  size = "sm",
}: StarRatingProps) {
  const [hovered, setHovered] = useState(false);

  const starSize = size === "lg" ? "text-2xl" : "text-base";
  const labelSize = size === "lg" ? "text-sm" : "text-xs";

  const stars = Array.from({ length: 5 }, (_, i) => {
    const filled = rating >= i + 1;
    const half = !filled && rating >= i + 0.5;
    return { filled, half };
  });

  return (
    <div
      className={`relative flex items-center gap-1 cursor-default ${className}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex">
        {stars.map((s, i) => (
          <span
            key={i}
            className={`${starSize} ${
              s.filled
                ? "text-yellow-400"
                : s.half
                ? "text-yellow-300"
                : "text-gray-300"
            }`}
          >
            {s.filled ? "★" : s.half ? "⯨" : "☆"}
          </span>
        ))}
      </div>
      <span className={`${labelSize} text-gray-500`}>
        {rating.toFixed(1)} ({total})
      </span>
      {hovered && distribution && Object.keys(distribution).length > 0 && (
        <RatingPopup rating={rating} total={total} distribution={distribution} />
      )}
    </div>
  );
}

export default StarRatingWidget;
