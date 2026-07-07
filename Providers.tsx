"use client";
import { Toaster } from "react-hot-toast";

import React from "react";

const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
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