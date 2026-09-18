import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// Vercel's per-deployment/preview URLs (*.vercel.app) must never be used as
// the checkout origin - Razorpay reflects whatever host the page was loaded
// from, so payments must always run on the real production domain.
const CANONICAL_HOST = "www.trynat.com";

export default withAuth(
  function middleware(req) {
    const host = req.headers.get("host") || "";
    if (host.endsWith(".vercel.app")) {
      const url = req.nextUrl.clone();
      url.protocol = "https";
      url.host = CANONICAL_HOST;
      url.port = "";
      return NextResponse.redirect(url, 308);
    }

    // Check for admin routes
    if (req.nextUrl.pathname.startsWith("/admin")) {
      if (req.nextauth.token?.role !== "admin") {
        // Redirect to home (not login) to avoid redirect loops
        return NextResponse.redirect(new URL("/", req.url));
      }
    }
  },
  {
    callbacks: {
      // Only /admin requires an authenticated session; the canonical-domain
      // redirect above must still run for every other route regardless of
      // auth state, so only gate on token when the path actually needs it.
      authorized: ({ token, req }) =>
        req.nextUrl.pathname.startsWith("/admin") ? !!token : true,
    },
  }
);

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
