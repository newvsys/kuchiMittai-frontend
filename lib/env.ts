/**
 * Centralized environment variable access.
 *
 * HOW IT WORKS
 * ---------------------------------------------------------------------------
 * Production (Vercel)
 *   Leave NEXT_PUBLIC_API_BASE_URL *empty* (or unset) in Vercel project settings.
 *   API calls use relative paths like /products/... which are intercepted
 *   by the Next.js rewrite proxy in next.config.mjs and forwarded server-side
 *   to the EC2 backend via API_BASE_URL.  No CORS needed.
 *
 *   Required in Vercel project settings:
 *     API_BASE_URL=http://<EC2-PUBLIC-IP>:8080/api  <- server-side only, not exposed
 *     NEXTAUTH_SECRET=<random 32-byte secret>
 *     NEXTAUTH_URL=https://<your-vercel-domain>
 *
 * Local development
 *   .env.local sets NEXT_PUBLIC_API_BASE_URL=http://localhost:8080 so the browser
 *   calls the local Spring Boot backend directly (CORS handled by backend config).
 * ---------------------------------------------------------------------------
 */
const raw = process.env.NEXT_PUBLIC_API_BASE_URL;
if (raw && raw.includes('localhost') && process.env.NODE_ENV === 'production') {
  console.warn(
    '[env] WARNING: NEXT_PUBLIC_API_BASE_URL points to localhost in production. ' +
    'Browsers on Vercel cannot reach localhost. ' +
    'Clear this variable to use the Next.js proxy, or set it to your EC2 public URL.'
  );
}
/**
 * Backend root URL without trailing slash.
 *
 * Empty string (default in production) -> relative /api/... paths are used.
 *   The Next.js rewrite proxy in next.config.mjs forwards them to the EC2 backend.
 *
 * Absolute URL (set in .env.local for local dev) -> direct browser->backend call.
 */
export const API_BASE = (raw ?? '').replace(/\/$/, '');
/**
 * Same as API_BASE but with any trailing /shopping stripped.
 * Used by review, QnA, and product-image endpoints that live under /api/...
 */
export const API_BASE_PLAIN = API_BASE.replace(/\/shopping$/, '');
