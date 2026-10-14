import type { Metadata } from "next";
import SearchResultsPage from "@/components/SearchResultsPage";

export const metadata: Metadata = {
  title: {
    absolute: "Organic Products & Natural Cooking Oils Online in India | TRYNAT",
  },
  description: "Shop organic grocery products, natural and cold-pressed cooking oils, and traditional Indian snacks online at TRYNAT. Compare product details and prices.",
  keywords: [
    "organic products online India",
    "organic grocery online",
    "natural cooking oil",
    "cold-pressed oil",
    "traditional Indian snacks",
    "natural food products",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Organic Products & Natural Cooking Oils Online in India | TRYNAT",
    description: "Shop organic grocery products, natural and cold-pressed cooking oils, and traditional Indian snacks online at TRYNAT.",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Organic Products & Natural Cooking Oils Online in India | TRYNAT",
    description: "Shop organic grocery products, natural and cold-pressed cooking oils, and traditional Indian snacks online at TRYNAT.",
    images: ["/promo/oilpromo1.png"],
  },
};

type SearchParams = { [key: string]: string | string[] | undefined };

export default async function Home({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  return (
    <SearchResultsPage
      preserveProductFiltersInLinks={false}
      searchParams={{
        price: params.price ?? "10000",
        minPrice: params.minPrice ?? "0",
        inStock: params.inStock ?? "false",
        sort: params.sort ?? "defaultSort",
        page: params.page ?? "1",
        search: params.search,
        categoryId: params.categoryId,
        outOfStock: params.outOfStock,
        rating: params.rating,
      }}
    />
  );
}
