"use client";

import React from "react";
import Link from "next/link";
import { DashboardSidebar } from "@/components";
import OrderDetailsView, {
  printOrderDetailsDocument,
  useOrderDetails,
} from "@/components/OrderDetailsView";

const AdminOrderDetailsPage = ({
  params,
}: {
  params: { orderNumber: string };
}) => {
  const orderNumber = decodeURIComponent(params.orderNumber);
  const { data, loading, error } = useOrderDetails(orderNumber);

  return (
    <div className="bg-white flex flex-col min-h-screen max-w-screen-2xl mx-auto">
      <DashboardSidebar />
      <div className="flex-1 xl:ml-5 w-full max-xl:mt-5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-3xl font-semibold">Order Details</h1>
            <p className="text-xs text-gray-400 mt-1 font-mono break-all">
              {orderNumber}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/orders" className="btn btn-sm btn-ghost">
              &larr; Back to Orders
            </Link>
            <button
              type="button"
              className="btn btn-sm bg-blue-500 hover:bg-blue-600 text-white border-none"
              disabled={!data}
              onClick={() => data && printOrderDetailsDocument(data)}
            >
              Print
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline"
              disabled={!data}
              onClick={() =>
                data && printOrderDetailsDocument(data, `order-${data.orderNumber}`)
              }
            >
              Download PDF
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : error ? (
          <div className="alert alert-error">
            <span>{error}</span>
          </div>
        ) : data ? (
          <OrderDetailsView details={data} />
        ) : null}
      </div>
    </div>
  );
};

export default AdminOrderDetailsPage;
