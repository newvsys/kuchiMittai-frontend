"use client";
import StockAvailabillity from "@/components/StockAvailabillity";
import ProductTabs from "@/components/ProductTabs";
import SingleProductDynamicFields from "@/components/SingleProductDynamicFields";
import { StarRatingWidget } from "@/components/StarRatingWidget";
import Image from "next/image";
import React, { useEffect, useState, useRef } from "react";
import { FaSquareFacebook } from "react-icons/fa6";
import { FaSquareXTwitter } from "react-icons/fa6";
import { FaSquarePinterest } from "react-icons/fa6";
import { MdChevronLeft, MdChevronRight } from "react-icons/md";
import { sanitize } from "@/lib/sanitize";

interface ImageItem {
  imageID: string;
  productID: string;
  image: string;
  isMainImage?: string;
}

interface SingleProductPageProps {
  params: { productSlug: string };
}


const SingleProductPage = ({ params }: SingleProductPageProps) => {
  // Unwrap params if it's a Promise (Next.js 14+ migration)
  // @ts-ignore
  const unwrappedParams = typeof params?.then === 'function' ? React.use(params) : params;
  const [baseProduct, setBaseProduct] = useState<any>(null); // always the original product
  const [product, setProduct] = useState<any>(null); // currently selected product/variant
  const [images, setImages] = useState<ImageItem[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [returnPolicyDialog, setReturnPolicyDialog] = useState(false);
  const [zoomLens, setZoomLens] = useState<{
    lensX: number;
    lensY: number;
    containerW: number;
    containerH: number;
  } | null>(null);
  const [fullViewOpen, setFullViewOpen] = useState(false);
  const [fullViewIndex, setFullViewIndex] = useState(0);
  const [fullViewTab, setFullViewTab] = useState<"image" | "video">("image");
  const [ratingSummary, setRatingSummary] = useState<{
    avgRating: number;
    totalReviews: number;
    distribution: Record<string, number>;
  } | null>(null);
  const [availableQty, setAvailableQty] = useState<number | null>(null);
  // Per-variant caches: prevent re-fetching images/inventory when switching back to a visited variant
  const imagesCacheRef = useRef<Map<number, ImageItem[]>>(new Map());
  const inventoryCacheRef = useRef<Map<number, number | null>>(new Map());
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://app:8080/shopping";
  const REVIEW_API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/shopping").replace(/\/shopping$/, "");

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    const fetchProduct = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/products/productSlug/${unwrappedParams.productSlug}`, { signal });
        if (signal.aborted) return;
        const data = await res.json();
        setBaseProduct(data);

        // If main variant is out of stock, auto-select first in-stock variant
        let activeProduct = data;
        if (data?.inStock !== 1 && Array.isArray(data?.productvarlist)) {
          const firstInStock = data.productvarlist.find((v: any) => v.inStock === 1);
          if (firstInStock) {
            activeProduct = { ...data, ...firstInStock, productvarlist: data.productvarlist };
          }
        }
        setProduct(activeProduct);

        // Fetch images and ratings in parallel
        setSelectedImage("/product_placeholder.jpg");
        const [imagesResult, ratingResult] = await Promise.allSettled([
          fetch(`${API_BASE_URL}/products/productImage/${activeProduct.id}`, { signal }).then(r => r.json()),
          fetch(`${REVIEW_API_BASE}/reviews/product/${data.productId ?? data.id}`, { signal }).then(r => r.ok ? r.json() : null),
        ]);

        if (signal.aborted) return;

        // Process images
        let imagesData: ImageItem[] = [];
        if (imagesResult.status === "fulfilled" && Array.isArray(imagesResult.value)) {
          imagesData = imagesResult.value;
        }
        const mainIdx = imagesData.findIndex((i: ImageItem) => i.isMainImage === "Y");
        if (mainIdx > 0) imagesData = [imagesData[mainIdx], ...imagesData.filter((_: ImageItem, i: number) => i !== mainIdx)];
        imagesCacheRef.current.set(activeProduct.id, imagesData);
        setImages(imagesData);
        if (imagesData.length > 0) {
          setSelectedImage(`/${imagesData[0].image}`);
        } else if (activeProduct.mainImage) {
          setSelectedImage(`/${activeProduct.mainImage}`);
        }

        // Process ratings
        if (ratingResult.status === "fulfilled" && ratingResult.value) {
          const rd = ratingResult.value;
          if (typeof rd.averageRating === "number" && typeof rd.totalReviews === "number") {
            setRatingSummary({
              avgRating: rd.averageRating,
              totalReviews: rd.totalReviews,
              distribution: rd.ratingDistribution ?? {},
            });
          }
        }
      } catch (err: any) {
        if (err.name === "AbortError") return;
        setProduct(null);
        setImages([]);
        setSelectedImage("/product_placeholder.jpg");
      }
    };
    const timer = setTimeout(() => { fetchProduct(); }, 0);
    return () => { clearTimeout(timer); controller.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unwrappedParams.productSlug]);

  // Fetch available inventory qty whenever the selected variant changes
  useEffect(() => {
    if (!product?.id) return;
    // Return cached result immediately — no API call needed
    if (inventoryCacheRef.current.has(product.id)) {
      setAvailableQty(inventoryCacheRef.current.get(product.id)!);
      return;
    }
    const controller = new AbortController();
    const invBase = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080").replace(/\/shopping$/, "");
    const invTimer = setTimeout(() => {
      fetch(`${invBase}/api/inventory/variant/${product.id}`, { signal: controller.signal })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          const qty = data?.availableQty ?? null;
          inventoryCacheRef.current.set(product.id, qty);
          setAvailableQty(qty);
        })
        .catch(err => { if (err.name !== "AbortError") setAvailableQty(null); });
    }, 0);
    return () => { clearTimeout(invTimer); controller.abort(); };
  }, [product?.id]);

  const slideImages = images.length > 0
    ? images.map((i) => `/${i.image}`)
    : [selectedImage || "/product_placeholder.jpg"];

  const currentSlideIndex = slideImages.indexOf(selectedImage || "");
  const effectiveIndex = currentSlideIndex >= 0 ? currentSlideIndex : 0;

  const goToPrev = () => {
    const newIndex = (effectiveIndex - 1 + slideImages.length) % slideImages.length;
    setSelectedImage(slideImages[newIndex]);
  };

  const goToNext = () => {
    const newIndex = (effectiveIndex + 1) % slideImages.length;
    setSelectedImage(slideImages[newIndex]);
  };

  const openFullView = () => {
    setFullViewIndex(effectiveIndex);
    setFullViewTab("image");
    setFullViewOpen(true);
  };

  const goFullPrev = () =>
    setFullViewIndex((i) => (i - 1 + slideImages.length) % slideImages.length);
  const goFullNext = () =>
    setFullViewIndex((i) => (i + 1) % slideImages.length);

  React.useEffect(() => {
    if (!fullViewOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullViewOpen(false);
      if (e.key === "ArrowLeft") goFullPrev();
      if (e.key === "ArrowRight") goFullNext();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [fullViewOpen]);

  const LENS_SIZE = 150;
  const ZOOM_PANEL_SIZE = 600;

  const handleMainImageMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const lensX = Math.max(0, Math.min(cx - LENS_SIZE / 2, rect.width - LENS_SIZE));
    const lensY = Math.max(0, Math.min(cy - LENS_SIZE / 2, rect.height - LENS_SIZE));
    setZoomLens({ lensX, lensY, containerW: rect.width, containerH: rect.height });
  };

  if (!product) {
    return <div className="text-center py-10 text-xl">Product not found.</div>;
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumb */}
        <nav className="mb-5 flex items-center gap-2 text-xl font-medium">
          <a href="/search?categoryId=0&price=10000&minPrice=0" className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 9.75L12 3l9 6.75V21a.75.75 0 01-.75.75H15.75a.75.75 0 01-.75-.75v-4.5h-6V21a.75.75 0 01-.75.75H3.75A.75.75 0 013 21V9.75z"/></svg>
            Home
          </a>
          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
          <a href="/search?categoryId=0&price=10000&minPrice=0" className="text-blue-600 hover:text-blue-800 transition-colors">Products</a>
          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
          <span className="text-gray-800 font-semibold truncate max-w-sm">{sanitize(product?.title)}</span>
        </nav>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 flex justify-center gap-x-12 max-lg:flex-col items-center gap-y-6">
          <div className="relative">
            <div className="relative w-[500px] max-w-full aspect-square max-lg:w-[350px] max-sm:w-[300px]">
              {/* Prev arrow */}
              {slideImages.length > 1 && (
                <button
                  type="button"
                  onClick={goToPrev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white rounded-full w-9 h-9 flex items-center justify-center shadow-md text-gray-700 hover:text-gray-900 transition-colors"
                  aria-label="Previous image"
                >
                  <MdChevronLeft className="text-2xl" />
                </button>
              )}

              {/* Main image with lens overlay */}
              <div
                className="w-full h-full rounded-lg border border-gray-100 bg-gray-50 relative select-none cursor-crosshair overflow-hidden"
                onMouseMove={handleMainImageMouseMove}
                onMouseLeave={() => setZoomLens(null)}
              >
                <Image
                  src={selectedImage || "/product_placeholder.jpg"}
                  fill
                  sizes="(max-width: 640px) 300px, (max-width: 1024px) 350px, 500px"
                  alt="main image"
                  className="object-contain p-2"
                />
                {/* Lens box */}
                {zoomLens && (
                  <div
                    className="absolute pointer-events-none border-2 border-blue-400 bg-blue-200/20"
                    style={{
                      width: LENS_SIZE,
                      height: LENS_SIZE,
                      left: zoomLens.lensX,
                      top: zoomLens.lensY,
                    }}
                  />
                )}
              </div>

              {/* Zoom panel — floats to the right of the image column */}
              {zoomLens && (
                <div
                  className="hidden lg:block absolute top-0 z-50 rounded-lg border border-gray-200 shadow-2xl"
                  style={{
                    left: "calc(100% + 16px)",
                    width: ZOOM_PANEL_SIZE,
                    height: ZOOM_PANEL_SIZE,
                    backgroundImage: `url(${selectedImage || "/product_placeholder.jpg"})`,
                    backgroundRepeat: "no-repeat",
                    backgroundSize: `${zoomLens.containerW * (ZOOM_PANEL_SIZE / LENS_SIZE)}px ${zoomLens.containerH * (ZOOM_PANEL_SIZE / LENS_SIZE)}px`,
                    backgroundPosition: `${-(zoomLens.lensX * (ZOOM_PANEL_SIZE / LENS_SIZE))}px ${-(zoomLens.lensY * (ZOOM_PANEL_SIZE / LENS_SIZE))}px`,
                  }}
                />
              )}

              {/* Next arrow */}
              {slideImages.length > 1 && (
                <button
                  type="button"
                  onClick={goToNext}
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white rounded-full w-9 h-9 flex items-center justify-center shadow-md text-gray-700 hover:text-gray-900 transition-colors"
                  aria-label="Next image"
                >
                  <MdChevronRight className="text-2xl" />
                </button>
              )}

              {/* Dot indicators */}
              {slideImages.length > 1 && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                  {slideImages.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedImage(img)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        effectiveIndex === idx ? "bg-blue-500" : "bg-gray-300 hover:bg-gray-400"
                      }`}
                      aria-label={`Go to image ${idx + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
            {/* Click to see full view */}
            <div className="text-center mt-2">
              <button
                type="button"
                onClick={openFullView}
                className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
              >
                Click to see full view
              </button>
            </div>
            <div className="flex justify-around mt-3 flex-wrap gap-y-1 max-[500px]:justify-center max-[500px]:gap-x-1">
              {images.map((imageItem: ImageItem, key: number) => (
                <div
                  key={imageItem.imageID + key}
                  className={`w-20 h-20 relative overflow-hidden rounded border-2 cursor-pointer flex-shrink-0 ${selectedImage === `/${imageItem.image}` ? 'border-blue-500' : 'border-transparent'}`}
                  onClick={() => setSelectedImage(`/${imageItem.image}`)}
                >
                  <Image
                    src={`/${imageItem.image}`}
                    fill
                    sizes="80px"
                    alt="product thumbnail"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-y-7 text-black max-[500px]:text-center">
            <h1 className="text-2xl font-bold text-gray-900 leading-snug">{sanitize(product?.title)}</h1>
            {product?.inStock !== 1 ? (
              <p className="text-xl font-semibold text-red-500">Currently out of stock</p>
            ) : (
              <>
                <div className="flex flex-col gap-y-1">
                  {product?.mrp && product.mrp > product.price ? (
                    <>
                      <div className="flex items-center gap-3 flex-wrap">
                        <p className="text-2xl font-bold text-gray-900">₹{product.price}</p>
                        <p className="text-base text-gray-400 line-through">MRP ₹{product.mrp}</p>
                        <span className="bg-green-100 text-green-700 text-sm font-semibold px-2 py-0.5 rounded">
                          {Math.round(((product.mrp - product.price) / product.mrp) * 100)}% off
                        </span>
                      </div>
                      <p className="text-sm text-green-600 font-medium">
                        You save ₹{Math.round(product.mrp - product.price)}
                      </p>
                    </>
                  ) : (
                    <p className="text-2xl font-bold text-gray-900">₹{product?.price}</p>
                  )}
                </div>
                <StockAvailabillity stock={product?.stock || 0} inStock={product?.inStock} />
                {availableQty !== null && availableQty < 5 && availableQty > 0 && (
                  <p className="text-sm font-semibold text-orange-600">
                    Only {availableQty} left in stock
                  </p>
                )}
              </>
            )}
            <SingleProductDynamicFields product={product} maxQty={availableQty ?? undefined} />
            {ratingSummary && ratingSummary.totalReviews > 0 && (
              <StarRatingWidget
                rating={ratingSummary.avgRating}
                total={ratingSummary.totalReviews}
                distribution={ratingSummary.distribution}
                size="lg"
              />
            )}
            {product?.isReturnable === "Y" ? (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-green-600">✔</span>
                <button
                  type="button"
                  className="text-blue-600 font-semibold hover:underline text-sm"
                  onClick={() => setReturnPolicyDialog(true)}
                >
                  Easy doorstep return
                </button>
              </div>
            ) : product?.isReturnable === "N" ? (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-800">✖</span>
                <button
                  type="button"
                  className="text-gray-800 font-semibold hover:underline text-sm"
                  onClick={() => setReturnPolicyDialog(true)}
                >
                  No Returns
                </button>
              </div>
            ) : null}
            <div className="flex flex-col gap-y-2 max-[500px]:items-center">
              {/* Size Option Buttons - Always show all sizes from baseProduct */}
              {Array.isArray(baseProduct?.productvarlist) && baseProduct.productvarlist.length > 0 && (() => {
                // Build unique list: main product + variants (avoid duplicate SKUs)
                const allVariants = [
                  { ...baseProduct, isMain: true },
                  ...baseProduct.productvarlist.map((v: any) => ({ ...v, isMain: false })),
                ];
                const uniqueVariants = allVariants.filter((v, idx, arr) => arr.findIndex(x => x.sku === v.sku) === idx);
                return (
                  <div className="mb-2 flex items-center gap-2">
                    <span className="font-semibold mr-2">Size:</span>
                    {uniqueVariants.map((variant: any) => (
                      <button
                        key={variant.sku}
                        className={`border rounded px-3 py-1 font-medium transition-colors
                          ${product.sku === variant.sku ? 'bg-blue-500 text-white' : 'bg-white text-black hover:bg-blue-100'}
                          ${variant.inStock !== 1 ? 'opacity-40' : 'cursor-pointer'}
                        `}
                        onClick={async () => {
                          if (product.sku === variant.sku) return;
                          setProduct({ ...baseProduct, ...variant, productvarlist: baseProduct.productvarlist });
                          // Use cached images if available — no API call needed
                          if (imagesCacheRef.current.has(variant.id)) {
                            const cached = imagesCacheRef.current.get(variant.id)!;
                            setImages(cached);
                            setSelectedImage(cached.length > 0 ? `/${cached[0].image}` : variant.mainImage ? `/${variant.mainImage}` : "/product_placeholder.jpg");
                            return;
                          }
                          // Fetch images for the selected variant
                          try {
                            const imagesRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080"}/api/products/productImage/${variant.id}`);
                            let imagesData = await imagesRes.json();
                            if (!Array.isArray(imagesData)) imagesData = [];
                            // Sort so main image (isMainImage === "Y") comes first
                            const mainIdx = imagesData.findIndex((i: any) => i.isMainImage === "Y");
                            if (mainIdx > 0) imagesData = [imagesData[mainIdx], ...imagesData.filter((_: any, i: number) => i !== mainIdx)];
                            imagesCacheRef.current.set(variant.id, imagesData);
                            setImages(imagesData);
                            if (imagesData.length > 0) {
                              setSelectedImage(`/${imagesData[0].image}`);
                            } else if (variant.mainImage) {
                              setSelectedImage(`/${variant.mainImage}`);
                            } else {
                              setSelectedImage("/product_placeholder.jpg");
                            }
                          } catch {
                            if (variant.mainImage) setSelectedImage(`/${variant.mainImage}`);
                            else setSelectedImage("/product_placeholder.jpg");
                            setImages([]);
                          }
                        }}
                        title={variant.inStock !== 1 ? 'Currently out of stock' : ''}
                      >
                        {variant.sku.replace(/.*-/, '')}
                      </button>
                    ))}
                  </div>
                );
              })()}
              <p className="text-sm text-gray-500">
                SKU: <span className="ml-1 font-mono text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded text-xs">{product?.sku || "N/A"}</span>
              </p>
              {/* Share and card details removed as requested */}
            </div>
          </div>
        </div>
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <ProductTabs product={product} baseProduct={baseProduct} />
        </div>
      </div>
      {returnPolicyDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between bg-blue-500 border-b border-blue-600 -mx-6 -mt-6 px-6 py-3 mb-5 rounded-t-2xl">
              <h3 className="text-base font-bold text-white">Return Policy</h3>
              <button
                type="button"
                className="text-white/80 hover:text-white text-2xl leading-none"
                onClick={() => setReturnPolicyDialog(false)}
              >
                &times;
              </button>
            </div>
            {product?.returnPolicy ? (
              <div className="border rounded p-4 text-sm">
              <div className="font-semibold text-gray-900 mb-1">{product.returnPolicy.name}</div>
              {product.returnPolicy.description && (
                <p className="text-gray-600 mb-3">{product.returnPolicy.description}</p>
              )}
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-700 mb-3">
                <div>
                  <span className="font-medium">Returnable:</span>{" "}
                  <span className={product.returnPolicy.isReturnable ? "text-green-600 font-semibold" : "text-red-500 font-semibold"}>
                    {product.returnPolicy.isReturnable ? "Yes" : "No"}
                  </span>
                </div>
                {product.returnPolicy.returnWindowDays != null && (
                  <div>
                    <span className="font-medium">Return Window:</span> {product.returnPolicy.returnWindowDays} days
                  </div>
                )}
                {product.returnPolicy.refundType && (
                  <div>
                    <span className="font-medium">Refund Type:</span> {product.returnPolicy.refundType}
                  </div>
                )}
                {product.returnPolicy.returnMethod && (
                  <div>
                    <span className="font-medium">Return Method:</span> {product.returnPolicy.returnMethod}
                  </div>
                )}
              </div>
              {product.returnPolicy.conditions && product.returnPolicy.conditions.length > 0 && (
                <div>
                  <div className="font-medium text-gray-800 mb-1 text-xs">Conditions</div>
                  <table className="w-full text-xs border rounded overflow-hidden">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="text-left px-3 py-1.5 font-medium text-gray-700">Condition Type</th>
                        <th className="text-left px-3 py-1.5 font-medium text-gray-700">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {product.returnPolicy.conditions.map((cond: any) => (
                        <tr key={cond.id} className="border-t">
                          <td className="px-3 py-1.5 text-gray-700">{cond.conditionType}</td>
                          <td className="px-3 py-1.5 text-gray-700">{cond.conditionValue}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            ) : (
              <div className="border rounded p-4 text-sm">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-gray-800 text-xl">✖</span>
                  <span className="font-semibold text-gray-800">No Returns</span>
                </div>
                <p className="text-gray-600 text-xs">Once delivered, this item cannot be returned or exchanged. Please review the product details carefully before placing your order.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Full View Popup */}
      {fullViewOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setFullViewOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden"
            style={{ width: "80vw", height: "80vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: tabs + close */}
            <div className="flex items-center justify-between border-b border-gray-200 px-4 flex-shrink-0">
              <div className="flex">
                {(["image", "video"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setFullViewTab(tab)}
                    className={`px-5 py-3 text-sm font-semibold capitalize border-b-2 transition-colors ${
                      fullViewTab === tab
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    {tab === "image" ? "Images" : "Video"}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setFullViewOpen(false)}
                className="text-gray-400 hover:text-gray-700 text-3xl leading-none font-light pr-1"
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            {/* Image tab */}
            {fullViewTab === "image" && (
              <>
                {/* Counter */}
                {slideImages.length > 1 && (
                  <div className="text-center text-xs text-gray-400 pt-2 flex-shrink-0">
                    {fullViewIndex + 1} / {slideImages.length}
                  </div>
                )}

                {/* Main image with arrows */}
                <div className="relative flex items-center justify-center flex-1 overflow-hidden min-h-0">
                  {slideImages.length > 1 && (
                    <button
                      type="button"
                      onClick={goFullPrev}
                      className="absolute left-3 z-10 bg-gray-100 hover:bg-gray-200 rounded-full w-10 h-10 flex items-center justify-center shadow transition-colors"
                      aria-label="Previous"
                    >
                      <MdChevronLeft className="text-2xl text-gray-700" />
                    </button>
                  )}

                  <div className="relative w-full h-full px-14" style={{ minHeight: 360 }}>
                    <Image
                      src={slideImages[fullViewIndex] || "/product_placeholder.jpg"}
                      fill
                      sizes="(max-width: 896px) 100vw, 896px"
                      alt="full view"
                      className="object-contain"
                      priority
                    />
                  </div>

                  {slideImages.length > 1 && (
                    <button
                      type="button"
                      onClick={goFullNext}
                      className="absolute right-3 z-10 bg-gray-100 hover:bg-gray-200 rounded-full w-10 h-10 flex items-center justify-center shadow transition-colors"
                      aria-label="Next"
                    >
                      <MdChevronRight className="text-2xl text-gray-700" />
                    </button>
                  )}
                </div>

                {/* Thumbnail strip */}
                {slideImages.length > 1 && (
                  <div className="flex justify-center gap-2 px-4 py-3 border-t border-gray-100 overflow-x-auto flex-shrink-0">
                    {slideImages.map((img, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setFullViewIndex(idx)}
                        className={`w-14 h-14 relative flex-shrink-0 rounded overflow-hidden border-2 transition-colors ${
                          fullViewIndex === idx
                            ? "border-blue-500"
                            : "border-gray-200 opacity-60 hover:opacity-100"
                        }`}
                        aria-label={`View image ${idx + 1}`}
                      >
                        <Image src={img} fill sizes="56px" alt="" className="object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Video tab */}
            {fullViewTab === "video" && (
              <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-[360px]">
                {product?.videoUrl ? (
                  <video
                    key={product.videoUrl}
                    src={`/${product.videoUrl}`}
                    controls
                    className="w-full max-h-[480px] rounded-lg bg-black"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-3 text-gray-400">
                    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                    </svg>
                    <p className="text-sm font-medium">No video available for this product</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SingleProductPage;
