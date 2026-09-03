"use client";
import { useEffect, useState } from "react";

const DEFAULT_SEARCH_HREF =
  "/search?categoryId=0&price=10000&minPrice=0&inStock=false&sort=lowPrice&page=1";

// Restores the shopper's last search filters instead of resetting to defaults
const ContinueShoppingLink = ({ className }: { className?: string }) => {
  const [href, setHref] = useState(DEFAULT_SEARCH_HREF);

  useEffect(() => {
    const filterQuery = sessionStorage.getItem("lastProductSearch");
    if (filterQuery) setHref(`/search?${filterQuery}`);
  }, []);

  return (
    <a href={href} className={className ?? "flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors"}>
      Continue Shopping
      <span aria-hidden="true">→</span>
    </a>
  );
};

export default ContinueShoppingLink;
