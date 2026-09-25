"use client";

import Link from "next/link";
import { MdChevronLeft, MdChevronRight } from "react-icons/md";
import { useEffect, useState } from "react";

type PromoImage = {
  src: string;
  alt: string;
  searchUrl: string;
  active: boolean;
};

const ProductAdvertisementFlashBar = () => {
  const [promoImages, setPromoImages] = useState<PromoImage[]>([]);
  const [startIndex, setStartIndex] = useState(0);

  useEffect(() => {
    const loadPromoImages = async () => {
      try {
        const response = await fetch(`/promo/promo-config.json?t=${Date.now()}`, {
          cache: "no-store",
        });
        const data: PromoImage[] = await response.json();
        setPromoImages(data.filter((promo) => promo.active));
      } catch (error) {
        console.error("Failed to load promo images", error);
      }
    };

    loadPromoImages();
  }, []);

  const visibleImages =
    promoImages.length > 0
      ? Array.from({ length: 3 }, (_, offset) => promoImages[(startIndex + offset) % promoImages.length])
      : [];

  useEffect(() => {
    if (promoImages.length === 0) return;

    const timer = window.setTimeout(() => {
      setStartIndex((current) => (current + 3) % promoImages.length);
    }, 10000);

    return () => window.clearTimeout(timer);
  }, [startIndex, promoImages.length]);

  const showPreviousSet = () => {
    setStartIndex((current) => (current - 3 + promoImages.length) % promoImages.length);
  };

  const showNextSet = () => {
    setStartIndex((current) => (current + 3) % promoImages.length);
  };

  if (promoImages.length === 0) return null;

  return (
    <section className="w-full" aria-label="Product advertisements">
      <div className="pt-1 pb-0">
        <div className="relative px-12 sm:px-14">
          <button
            type="button"
            onClick={showPreviousSet}
            className="absolute left-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-blue-100 bg-white text-blue-700 shadow-sm transition-colors hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:left-3"
            aria-label="Show previous promo images"
          >
            <MdChevronLeft className="h-6 w-6" aria-hidden="true" />
          </button>

          <div className="grid grid-cols-3 gap-1">
            {visibleImages.map((image, index) => (
              <Link
                key={`${image.src}-${index}`}
                href={image.searchUrl}
                className="block overflow-hidden"
              >
                <img
                  src={image.src}
                  alt={image.alt}
                  className="block h-auto w-full object-contain"
                />
              </Link>
            ))}
          </div>

          <button
            type="button"
            onClick={showNextSet}
            className="absolute right-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-blue-100 bg-white text-blue-700 shadow-sm transition-colors hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:right-3"
            aria-label="Show next promo images"
          >
            <MdChevronRight className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default ProductAdvertisementFlashBar;