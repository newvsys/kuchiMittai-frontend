/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
          {
            protocol: 'https',
            hostname: 'placehold.co',
            port: ''
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
