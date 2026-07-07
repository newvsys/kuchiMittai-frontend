
import { Loader } from "@/components/Loader";
import { CartModule } from "@/components/modules/cart";
import { Suspense } from "react";

const CartPage = () => {
  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="w-full px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-xl font-medium">
          <a href="/search?categoryId=0&price=10000&minPrice=0" className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 9.75L12 3l9 6.75V21a.75.75 0 01-.75.75H15.75a.75.75 0 01-.75-.75v-4.5h-6V21a.75.75 0 01-.75.75H3.75A.75.75 0 013 21V9.75z"/></svg>
            Home
          </a>
          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
          <span className="text-gray-800 font-semibold">Cart</span>
          <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
          <span className="text-gray-400">Checkout</span>
          <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
          <span className="text-gray-400">Payment</span>
          <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
          <span className="text-gray-400">Confirmation</span>
        </nav>
        <Suspense fallback={<Loader />}>
          <CartModule />
        </Suspense>
      </div>
    </div>
  );
};

export default CartPage;
