import type { MetadataRoute } from "next";

const SITE_URL = "https://www.trynat.com";
const API_BASE_URL = (process.env.API_BASE_URL || "http://localhost:8080/api").replace(/\/$/, "");

type Product = {
  slug?: string | null;
};

const publicPages = [
  { path: "/", priority: 1 },
  { path: "/shop", priority: 0.9 },
  { path: "/about", priority: 0.6 },
  { path: "/quality-assurance", priority: 0.6 },
  { path: "/privacy-policy", priority: 0.4 },
  { path: "/terms-and-conditions", priority: 0.4 },
  { path: "/cancellation-refund", priority: 0.4 },
];

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticUrls: MetadataRoute.Sitemap = publicPages.map(({ path, priority }) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: path === "/" || path === "/shop" ? "daily" : "monthly",
    priority,
  }));

  try {
    const response = await fetch(`${API_BASE_URL}/products/product`, { cache: "no-store" });
    if (!response.ok) return staticUrls;

    const products: Product[] = await response.json();
    const productUrls: MetadataRoute.Sitemap = Array.isArray(products)
      ? products
          .filter((product) => typeof product.slug === "string" && product.slug.trim() !== "")
          .map((product) => ({
            url: `${SITE_URL}/product/${encodeURIComponent(product.slug!.trim())}`,
            changeFrequency: "weekly",
            priority: 0.8,
          }))
      : [];

    return [...staticUrls, ...productUrls];
  } catch {
    return staticUrls;
  }
}