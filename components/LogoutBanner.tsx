"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function LogoutBanner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (searchParams.get("loggedout") === "true") {
      setVisible(true);
      // Auto-dismiss after 5 seconds
      const t = setTimeout(() => dismiss(), 5000);
      return () => clearTimeout(t);
    }
  }, [searchParams]);

  const dismiss = () => {
    setVisible(false);
    // Remove the query param without reloading
    router.replace("/", { scroll: false });
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="flex items-center justify-between gap-4 bg-white border border-blue-200 text-blue-800 text-sm px-6 py-4 rounded-2xl shadow-2xl max-w-sm w-full mx-4">
        <div className="flex items-center gap-3">
          <svg className="h-5 w-5 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="font-medium">You have been logged out successfully.</span>
        </div>
        <button
          onClick={dismiss}
          className="text-blue-400 hover:text-blue-700 transition-colors flex-shrink-0"
          aria-label="Dismiss"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
