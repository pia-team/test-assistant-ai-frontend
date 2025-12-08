import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api/backend/:path*",
        destination: `${process.env.API_URL || "http://localhost:8093"}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
