import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "d1.awsstatic.com", pathname: "/**" },
      { protocol: "https", hostname: "globalskiatlas.com", pathname: "/**" },
    ],
  },
};

export default nextConfig;
