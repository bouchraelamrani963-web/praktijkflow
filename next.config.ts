import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Allow optimized remote images from Unsplash for the hero visual.
    // Next/Image blocks all remote hosts by default — this whitelists the
    // single host we pull the dental-clinic photo from.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
