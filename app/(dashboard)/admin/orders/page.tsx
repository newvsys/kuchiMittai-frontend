"use client";
import { AdminOrders, DashboardSidebar } from "@/components";
import React from "react";

const DashboardOrdersPage = () => {
  return (
    <div className="bg-white flex flex-col min-h-screen max-w-screen-2xl mx-auto">
      <DashboardSidebar />
      <div className="flex-1">
        <AdminOrders />
      </div>
    </div>
  );
};

export default DashboardOrdersPage;
