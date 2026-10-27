import type { NextConfig } from 'next';

import { securityHeaders } from './src/lib/securityHeaders';

const nextConfig: NextConfig = {
  // Every page and API route gets the security headers.
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
