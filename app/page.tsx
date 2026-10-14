import type { Metadata } from "next";
import Link from "next/link";
import ProductAdvertisementFlashBar from "@/components/ProductAdvertisementFlashBar";
import ProductsSection from "@/components/ProductsSection";
import { API_BASE } from "@/lib/env";

const searchBase = "/search?price=10000&minPrice=0&inStock=false&sort=defaultSort&page=1";
type Category = { id: number; title: string };

export const metadata: Metadata = {
  title: {
    absolute: "TRYNAT | Natural & Organic Products Online in India",
  },
  description: "Shop natural food products, cooking oils and traditional snacks online at TRYNAT. Explore our products and order online.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "TRYNAT | Natural & Organic Products Online in India",
    description: "Shop natural food products, cooking oils and traditional snacks online at TRYNAT.",
    url: "/",
  },
};

async function getCategories(): Promise<Category[]> {
  if (!API_BASE) return [];
  try {
    const response = await fetch(`${API_BASE}/products/categories`, { next: { revalidate: 3600 } });
    if (!response.ok) return [];
    const categories: Category[] = await response.json();
    return Array.isArray(categories)
      ? categories.filter((category) => Number.isFinite(category.id) && typeof category.title === "string")
      : [];
  } catch {
    return [];
  }
}

function CategoryLinks({ categories }: { categories: Category[] }) {
  if (categories.length === 0) {
    return <Link className="font-semibold text-blue-700 underline underline-offset-4 hover:text-blue-900" href="/shop">Browse all products</Link>;
  }
  return (
    <ul className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold">
      {categories.map((category) => (
        <li key={category.id}>
          <Link
            className="text-blue-700 underline decoration-blue-200 underline-offset-4 hover:text-blue-900"
            href={`${searchBase}&categoryId=${encodeURIComponent(category.id)}`}
          >
            {category.title}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function Home() {
  const categories = await getCategories();
  const oilCategories = categories.filter((category) => /oil/i.test(category.title));
  const snackCategories = categories.filter((category) => /snack|sweet|halwa/i.test(category.title));
  const organicCategories = categories.filter((category) => /organic/i.test(category.title));

  return (
    <div className="bg-white text-gray-900">
      <section className="border-b border-gray-100">
        <div className="mx-auto max-w-screen-xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <p className="mb-2 text-sm font-semibold text-green-700">TryNat | Natural foods for everyday living</p>
          <h1 className="max-w-4xl text-3xl font-bold leading-tight sm:text-4xl">
            Natural and Organic Products for Everyday Living
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-gray-600">
            Shop natural food products, cooking oils, and traditional snacks and sweets online. Explore product details and ingredients before ordering from TryNat.
          </p>
          <p className="mt-3 text-sm text-gray-600">
            Looking for organic products? Browse our {organicCategories.length > 0 ? organicCategories.map((category, index) => (
              <span key={category.id}>
                {index > 0 ? ", " : ""}<Link className="font-medium text-blue-700 underline underline-offset-2" href={`${searchBase}&categoryId=${category.id}`}>{category.title}</Link>
              </span>
            )) : "product listings and check each item’s details"}.
          </p>
          <Link className="mt-5 inline-flex rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700" href="/shop">
            Explore all products
          </Link>
        </div>
      </section>

      <ProductAdvertisementFlashBar />

      <section className="mx-auto grid max-w-screen-xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-2 lg:px-8">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Explore Our Natural Food Products</h2>
          <p className="mt-2 text-sm leading-6 text-gray-600">Browse the product categories available in the TryNat store.</p>
          <nav aria-label="Product categories" className="mt-4">
            <CategoryLinks categories={categories} />
          </nav>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Cooking Oils for Your Kitchen</h2>
          <p className="mt-2 text-sm leading-6 text-gray-600">Find cooking oils and related products in our current catalog.</p>
          <nav aria-label="Cooking oil categories" className="mt-4">
            <CategoryLinks categories={oilCategories} />
          </nav>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Traditional Snacks and Sweets</h2>
          <p className="mt-2 text-sm leading-6 text-gray-600">Discover traditional snacks and sweets available to order online.</p>
          <nav aria-label="Traditional snacks and sweets categories" className="mt-4">
            <CategoryLinks categories={snackCategories} />
          </nav>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Our Approach to Natural Food</h2>
          <p className="mt-2 text-sm leading-6 text-gray-600">Learn about TryNat’s story, product quality approach, and order policies.</p>
          <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold">
            <li><Link className="text-blue-700 underline underline-offset-4" href="/about">About TryNat</Link></li>
            <li><Link className="text-blue-700 underline underline-offset-4" href="/quality-assurance">Quality assurance</Link></li>
            <li><Link className="text-blue-700 underline underline-offset-4" href="/cancellation-refund">Cancellations and refunds</Link></li>
            <li><a className="text-blue-700 underline underline-offset-4" href="mailto:customercare@trynat.com">Contact us</a></li>
          </ul>
        </div>
      </section>

      <ProductsSection />
    </div>
  );
}
