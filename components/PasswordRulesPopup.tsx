"use client";
import React from "react";

interface PasswordRulesPopupProps {
  onClose: () => void;
}

const PasswordRulesPopup: React.FC<PasswordRulesPopupProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded shadow-lg p-6 w-full max-w-xs relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 text-lg"
          aria-label="Close password rules"
        >
          &times;
        </button>
        <h3 className="text-lg font-bold mb-3 text-center">Password Rules</h3>
        <ul className="list-disc pl-5 text-sm text-gray-700 space-y-2">
          <li>At least 8 characters</li>
          <li>At least one uppercase letter</li>
          <li>At least one lowercase letter</li>
          <li>At least one number</li>
          <li>At least one special character (!@#$%^&amp;*)</li>
        </ul>
      </div>
    </div>
  );
};

export default PasswordRulesPopup;
