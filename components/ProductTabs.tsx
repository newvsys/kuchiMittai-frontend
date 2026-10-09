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

import React, { useEffect, useRef, useState } from "react";
import { MdKeyboardArrowDown } from "react-icons/md";
import { useSearchParams } from "next/navigation";
import { formatCategoryName } from "@/utils/categoryFormating";
import { sanitize, sanitizeHtml } from "@/lib/sanitize";
import ProductReviews from "./ProductReviews";
import ProductQnA from "./ProductQnA";

const ProductTabs = ({ product, baseProduct, sections = "all" }: { product: Product; baseProduct?: Product; sections?: "all" | "info" | "below" }) => {
  const showDescription = sections !== "info";
  const showInfo = sections !== "below";
  const showFeedback = sections !== "info";
  const searchParams = useSearchParams();
  const reviewsRef = useRef<HTMLElement>(null);
  const [showReviews, setShowReviews] = useState(false);
  const [showMoreInfo, setShowMoreInfo] = useState(false);
  const sortedAttributes: any[] = Array.isArray(product?.attributes)
    ? [...product.attributes].sort((a: any, b: any) => (a.displayOrder ?? Number.MAX_SAFE_INTEGER) - (b.displayOrder ?? Number.MAX_SAFE_INTEGER))
    : [];
  const topAttributes = sortedAttributes.slice(0, 6);
  const moreAttributes = sortedAttributes.slice(6);
  const renderAttributeRows = (attrs: any[]) => (
    <dl className="flex flex-col gap-y-3 text-sm">
      {attrs.map((attr: any) => (
        <div key={attr.id || attr.attributeName} className="grid grid-cols-[minmax(0,40%)_minmax(0,1fr)] gap-x-6">
          <dt className="font-semibold text-gray-900">{sanitize(attr.attributeName)}</dt>
          <dd className="text-gray-700 break-words">{sanitize(attr.attributeValue)}</dd>
        </div>
      ))}
    </dl>
  );
  const reviewProductId = baseProduct?.productId ?? baseProduct?.id ?? product?.productId ?? product?.id;

  useEffect(() => {
    const revealReviews = () => {
      if (window.location.hash === "#product-reviews" || searchParams.get("openReview") === "true") {
        setShowReviews(true);
      }
    };
    revealReviews();
    window.addEventListener("hashchange", revealReviews);
    return () => window.removeEventListener("hashchange", revealReviews);
  }, [searchParams]);

  useEffect(() => {
    if (showFeedback && showReviews) {
      reviewsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [showFeedback, showReviews]);

  const headingClass = "text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100";

  return (
    <div className="text-black w-full text-left flex flex-col gap-6">
      {showDescription && (
      <section>
        <h2 className={headingClass}>Description</h2>
        <div
          className="text-sm"
          dangerouslySetInnerHTML={{
            __html: sanitizeHtml(product?.description)
          }}
        />
      </section>
      )}

      {showInfo && (
      <section>
        <h2 className={headingClass}>Top Highlights</h2>
        {sortedAttributes.length > 0 ? (
          <>
            {renderAttributeRows(topAttributes)}
            {moreAttributes.length > 0 && (
              <div className="mt-4 border-t border-gray-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowMoreInfo((v) => !v)}
                  aria-expanded={showMoreInfo}
                  className="flex w-full items-center justify-between text-left text-sm font-semibold text-blue-600 hover:text-blue-800"
                >
                  <span>{showMoreInfo ? "Less Info" : "More Info"}</span>
                  <MdKeyboardArrowDown className={`text-2xl transition-transform ${showMoreInfo ? "rotate-180" : ""}`} />
                </button>
                {showMoreInfo && <div className="mt-3">{renderAttributeRows(moreAttributes)}</div>}
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-400 italic">No attributes available</p>
        )}
      </section>
      )}

      {showFeedback && (<>
      <section id="product-reviews" ref={reviewsRef}>
        {showReviews && (
          <>
            <h2 className={headingClass}>Ratings &amp; Reviews</h2>
            {reviewProductId && <ProductReviews productId={Number(reviewProductId)} />}
          </>
        )}
      </section>

      <section>
        <h2 className={headingClass}>Q&amp;A</h2>
        {reviewProductId && <ProductQnA productId={Number(reviewProductId)} />}
      </section>
      </>)}
    </div>
  );
};

export default ProductTabs;
