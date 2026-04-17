import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/register-vendor",
        destination: "/partner",
      },
    ];
  },
};

export default nextConfig;
