"use client";
import React from "react";
import CategoryItem from "./CategoryItem";
import Image from "next/image";
import { useEffect, useState } from "react";
import Heading from "./Heading";
import { useCategoryStore, Category } from "@/app/_zustand/categoryStore";

const PAGE_SIZE = 20;

const CategoryMenu = ({ initialCategories = [] }: { initialCategories?: Category[] }) => {
  const { categories: storeCategories, loading, error, fetchCategories, initCategories } = useCategoryStore();
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (initialCategories.length > 0) {
      initCategories(initialCategories); // seed store — prevents CategoryNavBar re-fetch
    } else {
      fetchCategories();
    }
  }, []);

  // Use store data if available, otherwise fall back to server-provided initialCategories
  const categoryMenuList = storeCategories.length > 0 ? storeCategories : initialCategories;
  const isLoading = loading && categoryMenuList.length === 0;

  const totalPages = Math.ceil(categoryMenuList.length / PAGE_SIZE);
  const paged = categoryMenuList.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div>
      {categoryMenuList.length > 0 && <Heading title="Featured Categories" />}
      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <>
          <div className="max-w-screen-2xl mx-auto py-6 px-4 sm:px-6 lg:px-10 gap-x-4 gap-y-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 justify-items-center">
            {paged.length === 0 ? (
              <div className="col-span-2 sm:col-span-3 md:col-span-4 lg:col-span-5 flex flex-col items-center justify-center py-12 text-center">
                <p className="text-gray-500 text-lg">New products will be available shortly.</p>
              </div>
            ) : paged.map((item, idx) => (
              <CategoryItem
                title={item.title.replace(/%20/g, ' ')}
                key={item.id}
                href={`/search?categoryId=${item.id}&price=10000&minPrice=0`}
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 relative overflow-hidden rounded-lg">
                  <Image
                    src={item.src.startsWith('http://') || item.src.startsWith('https://') ? item.src : item.src.startsWith('/') ? item.src : `/${item.src}`}
                    fill
                    sizes="(max-width: 640px) 64px, (max-width: 768px) 80px, 96px"
                    className="object-cover"
                    alt={item.title.replace(/%20/g, ' ')}
                    priority={idx < 5}
                  />
                </div>
              </CategoryItem>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-x-2 pb-10">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded border text-sm font-medium disabled:opacity-40 hover:bg-gray-100 transition-colors"
              >
                &lsaquo; Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1.5 rounded border text-sm font-medium transition-colors ${
                    currentPage === page
                      ? "bg-blue-500 text-white border-blue-500"
                      : "hover:bg-gray-100"
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded border text-sm font-medium disabled:opacity-40 hover:bg-gray-100 transition-colors"
              >
                Next &rsaquo;
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CategoryMenu;
