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
          {
            protocol: 'https',
            hostname: 'res.cloudinary.com',
            port: '',
            pathname: '/**',
          },
          // Allow image URLs from the backend API server
          // The hostname is derived from NEXT_PUBLIC_API_BASE_URL at build time
          ...(process.env.NEXT_PUBLIC_API_BASE_URL
            ? [{
                protocol: /** @type {'http'|'https'} */ (new URL(process.env.NEXT_PUBLIC_API_BASE_URL).protocol.replace(':', '')),
                hostname: new URL(process.env.NEXT_PUBLIC_API_BASE_URL).hostname,
                port: new URL(process.env.NEXT_PUBLIC_API_BASE_URL).port || '',
                pathname: '/**',
              }]
            : [{
                protocol: 'http',
                hostname: 'localhost',
                port: '8080',
                pathname: '/**',
              }]
          ),
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
      ];
    },
};

export default nextConfig;
