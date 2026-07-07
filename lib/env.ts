/**
 * Centralized environment variable access.
 *
 * Single source of truth for all API URLs.
 * Throws at startup in production if required variables are missing.
 *
 * Required env vars (set in Vercel project settings or .env.local):
 *   NEXT_PUBLIC_API_BASE_URL  — backend root URL, e.g. https://api.yourdomain.com
 *   NEXTAUTH_SECRET           — random secret for NextAuth session signing
 *   NEXTAUTH_URL              — public URL of this webapp, e.g. https://yourdomain.com
 */

const raw = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!raw && process.env.NODE_ENV === "production") {
  throw new Error(
    "[env] NEXT_PUBLIC_API_BASE_URL is not set.\n" +
      "Add it to your Vercel environment variables or .env.local for local dev.\n" +
      "Example: NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com"
  );
}

/** Backend root URL without trailing slash — e.g. http://localhost:8080 */
export const API_BASE = (raw ?? "http://localhost:8080").replace(/\/$/, "");

/**
 * Same as API_BASE but with any trailing /shopping stripped.
 * Used by review, QnA, and product-image endpoints that live under /api/...
 */
export const API_BASE_PLAIN = API_BASE.replace(/\/shopping$/, "");
