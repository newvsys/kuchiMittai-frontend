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
  const [slideDirection, setSlideDirection] = useState<"next" | "previous" | null>(null);
  const [slideReady, setSlideReady] = useState(false);

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

  const trackImages = promoImages.length > 0
    ? Array.from({ length: 4 }, (_, offset) => {
        const directionOffset = slideDirection === "previous" ? -1 : 0;
        const imageIndex = (startIndex + directionOffset + offset + promoImages.length) % promoImages.length;
        return promoImages[imageIndex];
      })
    : [];

  useEffect(() => {
    if (promoImages.length < 2 || slideDirection !== null) return;

    const timer = window.setTimeout(() => {
      setSlideDirection("next");
      setSlideReady(true);
    }, 10000);

    return () => window.clearTimeout(timer);
  }, [startIndex, promoImages.length, slideDirection]);

  useEffect(() => {
    if (slideDirection !== "previous" || slideReady) return;

    const frame = window.requestAnimationFrame(() => setSlideReady(true));
    return () => window.cancelAnimationFrame(frame);
  }, [slideDirection, slideReady]);

  const showPreviousSet = () => {
    if (promoImages.length < 2 || slideDirection !== null) return;
    setSlideReady(false);
    setSlideDirection("previous");
  };

  const showNextSet = () => {
    if (promoImages.length < 2 || slideDirection !== null) return;
    setSlideReady(true);
    setSlideDirection("next");
  };

  const finishSlide = (event: React.TransitionEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || event.propertyName !== "transform" || !slideDirection) return;

    setStartIndex((current) =>
      slideDirection === "next"
        ? (current + 1) % promoImages.length
        : (current - 1 + promoImages.length) % promoImages.length
    );
    setSlideDirection(null);
    setSlideReady(false);
  };

  const trackOffset = slideDirection === "next" && slideReady
    ? "-translate-x-full sm:-translate-x-1/3"
    : slideDirection === "previous"
      ? slideReady
        ? "translate-x-0"
        : "-translate-x-full sm:-translate-x-1/3"
      : "translate-x-0";

  if (promoImages.length === 0) return null;

  return (
    <section className="w-full" aria-label="Product advertisements">
      <div className="pt-1 pb-0">
        <div className="relative px-12 sm:px-14">
          <button
            type="button"
            onClick={showPreviousSet}
            disabled={promoImages.length < 2 || slideDirection !== null}
            className="absolute left-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-blue-100 bg-white text-blue-700 shadow-sm transition-colors hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40 sm:left-3"
            aria-label="Show previous promo images"
          >
            <MdChevronLeft className="h-6 w-6" aria-hidden="true" />
          </button>

          <div className="overflow-hidden">
            <div
              className={`flex w-full ${slideDirection && slideReady ? "transition-transform duration-500 ease-in-out" : ""} ${trackOffset}`}
              onTransitionEnd={finishSlide}
            >
              {trackImages.map((image) => (
                <div key={`${image.src}-${image.searchUrl}`} className="w-full shrink-0 basis-full sm:basis-1/3 sm:px-0.5">
                  <Link
                    href={image.searchUrl}
                    className="relative block aspect-[1300/830] overflow-hidden"
                  >
                    <img
                      src={image.src}
                      alt={image.alt}
                      className="absolute inset-0 block h-full w-full object-contain"
                    />
                  </Link>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={showNextSet}
            disabled={promoImages.length < 2 || slideDirection !== null}
            className="absolute right-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-blue-100 bg-white text-blue-700 shadow-sm transition-colors hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40 sm:right-3"
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