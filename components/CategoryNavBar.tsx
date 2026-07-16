"use client";
import Link from "next/link";
import { useEffect } from "react";
import { useCategoryStore } from "@/app/_zustand/categoryStore";

const CategoryNavBar = () => {
  const { categories, fetchCategories } = useCategoryStore();

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return (
    <nav className="bg-blue-500 w-full shadow-md">
      <div className="max-w-screen-2xl mx-auto px-16 max-md:px-6 flex items-center gap-x-1 overflow-x-auto scrollbar-hide py-1.5">
        {categories.length > 0 && (
          <>
            <Link
              href="/search?categoryId=0&price=10000&minPrice=0"
              className="whitespace-nowrap text-sm font-bold px-4 py-2 rounded-lg bg-white text-blue-600 hover:bg-blue-50 transition-colors flex-shrink-0 shadow-sm"
            >
              All Products
            </Link>
            <div className="w-px h-5 bg-blue-400 mx-1 flex-shrink-0" />
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/search?categoryId=${cat.id}&price=10000&minPrice=0`}
                className="whitespace-nowrap text-sm font-medium px-3 py-2 rounded-lg hover:bg-blue-600 hover:text-white transition-colors text-white flex-shrink-0"
              >
                {cat.title.replace(/%20/g, " ")}
              </Link>
            ))}
          </>
        )}
      </div>
    </nav>
  );
};

export default CategoryNavBar;
