"use client";
import AdminReviews from "@/components/AdminReviews";
import { DashboardSidebar } from "@/components";
import React from "react";

const DashboardReviewsPage = () => {
  return (
    <div className="bg-white flex flex-col min-h-screen max-w-screen-2xl mx-auto">
      <DashboardSidebar />
      <div className="flex-1">
        <AdminReviews />
      </div>
    </div>
  );
};

export default DashboardReviewsPage;
