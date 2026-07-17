/**
 * Centralized environment variable access.
 *
 * HOW IT WORKS
 * ---------------------------------------------------------------------------
 * Production (Vercel)
 *   Leave NEXT_PUBLIC_API_BASE_URL empty (or unset).
 *   Browser requests use relative URLs (/api/...) which are proxied by
 *   Next.js rewrites to API_BASE_URL.
 *
 * Local Development
 *   Browser (Client Components):
 *     NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api
 *
 *   Server Components / API Routes:
 *     API_BASE_URL=http://localhost:8080/api
 *
 * Docker Development
 *   Browser:
 *     NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api
 *
 *   Server Components (running inside frontend container):
 *     API_BASE_URL=http://app:8080/api
 * ---------------------------------------------------------------------------
 */

// Use server-side API URL when executing on the server,
// otherwise use the browser-accessible URL.
const raw =
  typeof window === "undefined"
    ? process.env.API_BASE_URL
    : process.env.NEXT_PUBLIC_API_BASE_URL;

// Warn only if a browser build points to localhost in production.
if (
  typeof window !== "undefined" &&
  raw &&
  raw.includes("localhost") &&
  process.env.NODE_ENV === "production"
) {
  console.warn(
    "[env] WARNING: NEXT_PUBLIC_API_BASE_URL points to localhost in production. " +
      "Browsers on Vercel cannot reach localhost. " +
      "Clear this variable to use the Next.js proxy, or set it to your EC2 public URL."
  );
}

/**
 * Backend root URL without trailing slash.
 */
export const API_BASE = (raw ?? "").replace(/\/$/, "");

/**
 * Same as API_BASE but with any trailing /shopping stripped.
 * Used by review, QnA, and product-image endpoints that live under /api/...
 */
export const API_BASE_PLAIN = API_BASE.replace(/\/shopping$/, "");