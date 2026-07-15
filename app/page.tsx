import CategoryMenu from "@/components/CategoryMenu";
import { Suspense } from "react";
import LogoutBanner from "@/components/LogoutBanner";
import { Category } from "@/app/_zustand/categoryStore";
import { API_BASE } from "@/lib/env";

export default async function Home() {
  // Pre-fetch categories server-side — eliminates client-side loading state
  let initialCategories: Category[] = [];
  try {
    const res = await fetch(`${API_BASE}/products/categories`, { next: { revalidate: 3600 } });
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
