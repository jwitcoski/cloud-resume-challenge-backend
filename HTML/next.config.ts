import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // S3 + CloudFront need route/index.html, not route.html at bucket root
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
