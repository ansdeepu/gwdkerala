
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Build attempt at timestamp 1773966086106
  reactStrictMode: true,
  typescript: {
    // Set to false to ignore build errors.
    ignoreBuildErrors: false,
  },
  eslint: {
    // Set to false to ignore linting errors during build.
    ignoreDuringBuilds: false,
  },
  allowedDevOrigins: [
    "https://6000-firebase-gwd-kerala1-1770522254979.cluster-sumfw3zmzzhzkx4mpvz3ogth4y.cloudworkstations.dev",
    "https://6000-firebase-gwd-kerala-1772693375957.cluster-sumfw3zmzzhzkx4mpvz3ogth4y.cloudworkstations.dev",
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'drive.google.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https' ,
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.imgur.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.postimg.cc',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.postimg.cc',
        port: '',
        pathname: '/**',
      },
    ],
  },
  env: {
    // This forces a cache bust on every build.
    CACHE_BUSTER: `build-t-final-attempt-${Date.now()}`,
  },
};

module.exports = nextConfig;
