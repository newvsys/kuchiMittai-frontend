// *********************
// Role of the component: Single product tabs on the single product page containing product description, main product info and reviews
// Name of the component: ProductTabs.tsx
// Developer: perumal ponnusamy
// Version: 1.0
// Component call: <ProductTabs product={product} />
// Input parameters: { product: Product }
// Output: Single product tabs containing product description, main product info and reviews
// *********************

"use client";

import React, { useState } from "react";
import { useSearchParams } from "next/navigation";
import RatingPercentElement from "./RatingPercentElement";
import SingleReview from "./SingleReview";
import { formatCategoryName } from "@/utils/categoryFormating";
import { sanitize, sanitizeHtml } from "@/lib/sanitize";
import ProductReviews from "./ProductReviews";
import ProductQnA from "./ProductQnA";

const ProductTabs = ({ product, baseProduct }: { product: Product; baseProduct?: Product }) => {
  const searchParams = useSearchParams();
  const [currentProductTab, setCurrentProductTab] = useState<number>(
    searchParams.get("openReview") === "true" ? 2 : 0
  );

  return (
    <div className="px-5 text-black">
      <div className="grid grid-cols-4 border-b border-gray-200">
        {[
          { label: "Description", idx: 0 },
          { label: "Additional Info", idx: 1 },
          { label: "Ratings & Reviews", idx: 2 },
          { label: "Q&A", idx: 3 },
        ].map(({ label, idx }) => (
          <button
            key={idx}
            type="button"
            onClick={() => setCurrentProductTab(idx)}
            className={`py-3 text-sm font-semibold border-b-2 transition-all duration-150 text-center
              ${currentProductTab === idx
                ? "bg-blue-500 text-white border-blue-500"
                : "bg-gray-100 text-gray-600 border-transparent hover:bg-blue-50 hover:text-blue-600"
              }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="pt-5">
        {currentProductTab === 0 && (
          <div 
            className="text-lg max-sm:text-base max-sm:text-sm"
            dangerouslySetInnerHTML={{ 
              __html: sanitizeHtml(product?.description) 
            }}
          />
        )}

        {currentProductTab === 1 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm max-[500px]:text-xs border-collapse">
              <tbody>
                {Array.isArray(product?.attributes) && product.attributes.length > 0 ? (
                  product.attributes.map((attr: any) => (
                    <tr key={attr.id || attr.attributeName} className="border-b border-gray-100">
                      <th className="text-left px-4 py-2.5 font-semibold text-gray-700 bg-gray-50 w-1/3 whitespace-nowrap">{sanitize(attr.attributeName)}</th>
                      <td className="text-left px-4 py-2.5 text-gray-600">{sanitize(attr.attributeValue)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} className="px-4 py-3 text-gray-400 italic">No attributes available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {currentProductTab === 2 && (baseProduct?.productId ?? baseProduct?.id ?? product?.productId ?? product?.id) && (
          <ProductReviews productId={(baseProduct?.productId ?? baseProduct?.id ?? product?.productId ?? product?.id) as number} />
        )}

        {currentProductTab === 3 && (baseProduct?.id ?? product?.id) && (
          <ProductQnA productId={(baseProduct?.productId ?? baseProduct?.id ?? product?.productId ?? product?.id) as number} />
        )}
      </div>
    </div>
  );
};

export default ProductTabs;
