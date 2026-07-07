"use client";

import { DashboardSidebar } from "@/components";
import React from "react";

const AdminMasterDataPage = () => {
  return (
    <div className="bg-white flex flex-col min-h-screen max-w-screen-2xl mx-auto">
      <DashboardSidebar />
      <div className="flex flex-col w-full p-6 max-xl:p-4">
        <h1 className="text-2xl font-semibold text-blue-600">Master Data</h1>
        <p className="mt-2 text-gray-600">
          Configure and maintain core platform master data here.
        </p>

        <div className="mt-6 rounded-lg border border-gray-200 p-6 bg-gray-50">
          <p className="text-gray-700 font-medium">No master data modules configured yet.</p>
          <p className="text-sm text-gray-500 mt-1">
            This page is ready for master data management integration.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminMasterDataPage;
