// *********************
// Role of the component: Top navigation bar on admin dashboard page
// Name of the component: DashboardSidebar.tsx
// Developer: perumal ponnusamy
// Version: 2.0
// Component call: <DashboardSidebar />
// Input parameters: no input parameters
// Output: horizontal top navbar for admin dashboard page
// *********************

"use client";
import React from "react";
import { FaTable } from "react-icons/fa6";
import { FaRegUser } from "react-icons/fa6";
import { FaBagShopping } from "react-icons/fa6";
import { FaBox } from "react-icons/fa6";
import { MdCategory } from "react-icons/md";
import { MdAssignmentReturn } from "react-icons/md";
import { MdPolicy } from "react-icons/md";
import { MdOutlineAssignmentReturn } from "react-icons/md";
import { MdLocalShipping } from "react-icons/md";
import { MdOutlineLocalShipping } from "react-icons/md";
import { MdFormatListBulleted } from "react-icons/md";
import { MdStar } from "react-icons/md";
import { MdQuestionAnswer } from "react-icons/md";
import { MdWarehouse } from "react-icons/md";
import { MdInventory } from "react-icons/md";
import { MdStraighten } from "react-icons/md";
import { MdTune } from "react-icons/md";
import { MdCampaign } from "react-icons/md";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/admin/warehouses",      label: "Warehouses",               icon: <MdWarehouse /> },
  { href: "/admin/categories",      label: "Categories",       icon: <MdCategory /> },
  { href: "/admin/products",        label: "Products",         icon: <FaTable /> },
  { href: "/admin/return-policies", label: "Return Policies",  icon: <MdPolicy /> },
  { href: "/admin/orders",          label: "Orders",           icon: <FaBagShopping /> },
  { href: "/admin/users",           label: "Users",            icon: <FaRegUser /> },
  { href: "/admin/cartons",         label: "Cartons",          icon: <FaBox /> },
  { href: "/admin/api/reason-master",   label: "Reason Master",    icon: <MdFormatListBulleted /> },
  { href: "/admin/refund-process",  label: "Refund Process",   icon: <MdAssignmentReturn /> },
  { href: "/admin/return-requests", label: "Return Request Approval",  icon: <MdOutlineAssignmentReturn /> },
  { href: "/admin/reviews",          label: "Reviews & Ratings",        icon: <MdStar /> },
  { href: "/admin/qa",               label: "Q&A",                      icon: <MdQuestionAnswer /> },
  { href: "/admin/delivery-charges",    label: "Delivery Charges",      icon: <MdLocalShipping /> },
  { href: "/admin/shipping-management", label: "Shipping Management",   icon: <MdOutlineLocalShipping /> },
  { href: "/admin/inventory",         label: "Inventory",                icon: <MdInventory /> },
  { href: "/admin/uom",               label: "UOM Master",               icon: <MdStraighten /> },
  { href: "/admin/label-config",      label: "Label Config",             icon: <MdTune /> },
  { href: "/admin/flash-messages",    label: "Flash Messages",           icon: <MdCampaign /> },
];

const DashboardSidebar = () => {
  const pathname = usePathname();

  return (
    <nav className="w-full bg-blue-500 shadow-md">
      <div className="max-w-screen-2xl mx-auto flex flex-wrap items-center gap-0">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={`flex items-center gap-x-2 px-4 py-4 text-sm font-medium text-white cursor-pointer transition-colors whitespace-nowrap
                  ${isActive ? "bg-blue-700 border-b-2 border-white" : "hover:bg-blue-600"}`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default DashboardSidebar;
