"use client";
import React, { useEffect, useState } from "react";
import { API_BASE } from "@/lib/env";

interface ShippingStatus {
  status: string;
  date: string;
  location?: string;
  remarks?: string;
}

interface ShippingHistoryResponse {
  shippingTrackId: string;
  history: ShippingStatus[];
}

const TrackPackagePopup = ({ shippingTrackId, onClose }: { shippingTrackId: string; onClose: () => void }) => {
  const [history, setHistory] = useState<ShippingStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchShippingHistory = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/shipping-history/${shippingTrackId}`);
        if (!res.ok) throw new Error("Failed to fetch shipping history");
        const data = await res.json();
        const parsedHistory: ShippingStatus[] = Array.isArray(data)
          ? data
          : (data && (data as ShippingHistoryResponse).history) || [];
        setHistory(parsedHistory);
      } catch (err: any) {
        setError(err.message || "Error fetching shipping history");
      } finally {
        setLoading(false);
      }
    };
    fetchShippingHistory();
  }, [shippingTrackId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 bg-gradient-to-r from-blue-600 to-indigo-500 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center gap-3">
            <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h3 className="text-base font-bold text-white">Track Order</h3>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white text-2xl leading-none">&times;</button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-8 py-6">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-14 text-gray-500 text-sm">
              <svg className="animate-spin h-6 w-6 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              <span>Loading tracking info…</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
                <svg className="h-6 w-6 text-red-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              </div>
              <p className="text-sm text-red-500 font-medium">{error}</p>
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <svg className="h-7 w-7 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V7a2 2 0 00-2-2H6a2 2 0 00-2 2v6m16 0v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6m16 0H4" />
                </svg>
              </div>
              <p className="text-base font-semibold text-gray-700">No updates yet</p>
              <p className="text-sm text-gray-400 mt-1">Tracking info will appear once your shipment is picked up.</p>
            </div>
          ) : (
            <ul className="space-y-0">
              {history.map((status, idx) => {
                const isFirst = idx === 0;
                const isLast = idx === history.length - 1;
                return (
                  <li key={idx} className="flex gap-4">
                    {/* Timeline connector */}
                    <div className="flex flex-col items-center">
                      <div className={`w-4 h-4 rounded-full mt-1 flex-shrink-0 ring-2 ring-offset-2 ${
                        /cancel/i.test(status.status) ? "bg-red-400 ring-red-300"
                        : isFirst ? "bg-green-500 ring-green-400"
                        : "bg-green-300 ring-green-200"
                      }`} />
                      {!isLast && <div className={`w-0.5 flex-1 my-1.5 min-h-[20px] ${/cancel/i.test(status.status) ? "bg-red-200" : "bg-green-200"}`} />}
                    </div>
                    {/* Content */}
                    <div className={`pb-6 flex-1 ${isLast ? "pb-0" : ""}`}>
                      <p className={`text-base font-semibold ${
                        /cancel/i.test(status.status) ? "text-red-600"
                        : isFirst ? "text-green-700"
                        : "text-green-600"
                      }`}>{status.status}</p>
                      <p className="text-sm text-gray-400 mt-0.5">{new Date(status.date).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                      {status.location && (
                        <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5">
                          <svg className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {status.location}
                        </p>
                      )}
                      {status.remarks && (
                        <p className="text-sm text-gray-400 mt-0.5 italic">{status.remarks}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrackPackagePopup;
