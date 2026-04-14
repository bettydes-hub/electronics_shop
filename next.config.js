/** @type {import('next').NextConfig} */
function securityHeaders() {
  const headers = [
    { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    {
      key: 'Permissions-Policy',
      value: 'camera=(), microphone=(), geolocation=()',
    },
  ];
  const hstsEligible =
    process.env.NODE_ENV === 'production' &&
    process.env.DISABLE_HSTS !== 'true' &&
    (process.env.VERCEL === '1' || process.env.FORCE_HSTS === 'true');
  if (hstsEligible) {
    headers.push({
      key: 'Strict-Transport-Security',
      value: 'max-age=63072000; includeSubDomains',
    });
  }
  return headers;
}

const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders(),
      },
    ];
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
    ],
  },
};

module.exports = nextConfig;
