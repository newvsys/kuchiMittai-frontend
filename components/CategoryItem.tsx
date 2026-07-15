"use client";
// *********************
// Role of the component: Category Item that will display category icon, category name and link to the category
// Name of the component: CategoryItem.tsx
// Developer: perumal ponnusamy
// Version: 1.0
// Component call: <CategoryItem title={title} href={href} ><Image /></CategoryItem>
// Input parameters: CategoryItemProps interface
// Output: Category icon, category name and link to the category
// *********************

import Link from "next/link";
import React, { type ReactNode } from "react";

interface CategoryItemProps {
  children: ReactNode;
  title: string;
  href: string;
  disabled?: boolean;
  onClick?: () => void;
}

const CategoryItem = ({ title, children, href, disabled = false, onClick }: CategoryItemProps) => {
  const handleClick = (e: React.MouseEvent) => {
    if (disabled) {
      e.preventDefault();
      return;
    }
    if (onClick) onClick();
  };

  return (
    <Link href={href} onClick={handleClick}>
      <div className="flex flex-col items-center gap-y-2 bg-white py-3 text-black hover:bg-gray-100 transition-all duration-150">
        {children}
        <h3 className="font-medium text-sm sm:text-base text-center px-1">{title}</h3>
      </div>
    </Link>
  );
};

export default CategoryItem;
