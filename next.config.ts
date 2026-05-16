import type { NextConfig } from "next";

const nextConfig: NextConfig = {

  allowedDevOrigins: [
    "10.0.2.2",
    "10.36.2.165",
    "localhost"
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
  output: 'standalone',

};

export default nextConfig;