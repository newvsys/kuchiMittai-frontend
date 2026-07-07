"use client";
import AdminQnA from "@/components/AdminQnA";
import { DashboardSidebar } from "@/components";
import React from "react";

const DashboardQnAPage = () => {
  return (
    <div className="bg-white flex flex-col min-h-screen max-w-screen-2xl mx-auto">
      <DashboardSidebar />
      <div className="flex-1">
        <AdminQnA />
      </div>
    </div>
  );
};

export default DashboardQnAPage;
