/** Parse a URL only when it is absolute; relative values (e.g. "/api") have no host. */
const toAbsoluteUrl = (value) => {
  try {
    return value ? new URL(value) : null;
  } catch {
    return null;
  }
};

/** @type {import('next').NextConfig} */
const nextConfig = {
    async rewrites() {
      // Proxy all /api/* requests that don't match a Next.js API route to the
      // Spring Boot backend. Uses the server-side API_BASE_URL so the browser
      // never needs to know the backend address → eliminates CORS entirely.
      const apiBase = (process.env.API_BASE_URL ?? 'http://localhost:8080/api').replace(/\/$/, '');
      return {
        // "fallback" rewrites run only when no page/API route matched first,
        // so /api/auth/[...nextauth] and /api/pincode still go to Next.js.
        fallback: [
          {
            source: '/api/:path*',
            destination: `${apiBase}/:path*`,
          },
        ],
      };
    },
    images: {
        remotePatterns: [
          {
            protocol: 'https',
            hostname: 'placehold.co',
            port: ''
          },
          // Allow Cloudinary-hosted images (category/product images)
          {
            protocol: 'https',
            hostname: 'res.cloudinary.com',
            port: '',
            pathname: '/efmugjt7/**',
          },
          // Allow image URLs from the backend API server.
          // Hostname comes from whichever backend URL is absolute; when the
          // browser uses the relative proxy path there is no extra host.
          ...(() => {
            const backend =
              toAbsoluteUrl(process.env.NEXT_PUBLIC_API_BASE_URL) ??
              toAbsoluteUrl(process.env.API_BASE_URL);
            if (!backend) {
              return [{
                protocol: /** @type {'http'} */ ('http'),
                hostname: 'localhost',
                port: '8080',
                pathname: '/**',
              }];
            }
            return [{
              protocol: /** @type {'http'|'https'} */ (backend.protocol.replace(':', '')),
              hostname: backend.hostname,
              port: backend.port || '',
              pathname: '/**',
            }];
          })(),
        ],
      },
    async headers() {
      return [
        {
          source: '/(.*)',
          headers: [
            {
              key: 'X-Frame-Options',
              value: 'DENY',
            },
            {
              key: 'X-Content-Type-Options',
              value: 'nosniff',
            },
            {
              key: 'X-XSS-Protection',
              value: '1; mode=block',
            },
          ],
        },
        // Service worker must never be served from a CDN cache.
        // - Cache-Control: no-cache forces the browser to revalidate on every page load.
        // - Service-Worker-Allowed: / explicitly permits root-scope registration even
        //   though the file already lives at the root (belt-and-suspenders for Vercel).
        {
          source: '/firebase-messaging-sw.js',
          headers: [
            {
              key: 'Cache-Control',
              value: 'no-cache, no-store, must-revalidate',
            },
            {
              key: 'Service-Worker-Allowed',
              value: '/',
            },
          ],
        },
      ];
    },
};

export default nextConfig;
