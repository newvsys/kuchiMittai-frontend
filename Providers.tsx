"use client";
import { Toaster } from "react-hot-toast";
import React from "react";
import PushNotificationProvider from "@/components/PushNotificationProvider";

const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <PushNotificationProvider />
      <Toaster
        position="top-center"
        containerStyle={{ top: 185 }}
        toastOptions={{
          className: "",
          duration: 1200,
          style: {
            fontSize: "20px",
          },
        }}
      />
      {children}
    </>
  );
};

export default Providers;