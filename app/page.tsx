import CategoryMenu from "@/components/CategoryMenu";
import { Suspense } from "react";
import LogoutBanner from "@/components/LogoutBanner";
import { Category } from "@/app/_zustand/categoryStore";

export default async function Home() {
  // Pre-fetch categories server-side — eliminates client-side loading state
  let initialCategories: Category[] = [];
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
    const res = await fetch(`${baseUrl}/api/products/categories`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) initialCategories = data;
    }
  } catch {}

  return (
    <>
      <Suspense fallback={null}>
        <LogoutBanner />
      </Suspense>
      <CategoryMenu initialCategories={initialCategories} />
    </>
  );
}
