// *********************
// Role of the component: Custom button component
// Name of the component: CustomButton.tsx
// Developer: perumal ponnusamy
// Version: 1.0
// Component call: <CustomButton paddingX={paddingX} paddingY={paddingY} text={text} buttonType={buttonType} customWidth={customWidth} textSize={textSize} />
// Input parameters: CustomButtonProps interface
// Output: custom button component
// *********************

import React from "react";

interface CustomButtonProps {
  paddingX: number;
  paddingY: number;
  text: string;
  buttonType: "submit" | "reset" | "button";
  customWidth: string;
  textSize: string;
  onClick?: () => void | Promise<void>;
  disabled?: boolean;
  className?: string;
}

const CustomButton = ({
  paddingX,
  paddingY,
  text,
  buttonType,
  customWidth,
  textSize,
  onClick,
  disabled,
  className = ""
}: CustomButtonProps) => {
  return (
    <button
      type={buttonType}
      className={`uppercase px-${paddingX} py-${paddingY} text-${textSize} font-bold shadow-sm focus:outline-none focus:ring-2 border border-gray-300 ${customWidth !== "no" ? `w-${customWidth}` : ""} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {text}
    </button>
  );
};

export default CustomButton;
