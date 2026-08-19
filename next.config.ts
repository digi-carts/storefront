import type { NextConfig } from 'next';

const CATALOG_URL = process.env.CATALOG_SERVICE_URL || 'http://localhost:3004';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: `${CATALOG_URL}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
