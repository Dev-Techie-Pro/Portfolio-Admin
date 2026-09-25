import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  async headers() {
    const isProd = process.env.NODE_ENV === 'production';
    const staticCache = isProd
      ? 'public, max-age=31536000, immutable'
      : 'public, max-age=0, must-revalidate';
    return [
      {
        source: '/js/chunks/:path*',
        headers: [{ key: 'Cache-Control', value: staticCache }],
      },
      {
        source: '/js/vendor/:path*',
        headers: [{ key: 'Cache-Control', value: staticCache }],
      },
      {
        source: '/images/:path*',
        headers: [{ key: 'Cache-Control', value: isProd ? 'public, max-age=604800' : staticCache }],
      },
      {
        source: '/js/main.js',
        headers: [{
          key: 'Cache-Control',
          value: isProd ? 'public, max-age=3600, must-revalidate' : 'public, max-age=0, must-revalidate',
        }],
      },
      {
        source: '/js/:file(boot-prefetch|prefetch-config|body-loader-template).js',
        headers: [{
          key: 'Cache-Control',
          value: isProd ? 'public, max-age=3600, must-revalidate' : 'public, max-age=0, must-revalidate',
        }],
      },
    ];
  },
  typescript: {
    // Gradual migration: type errors are fixed incrementally after the JS → TS rename.
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    config.resolve.alias['@'] = __dirname;
    return config;
  },
};

export default nextConfig;
