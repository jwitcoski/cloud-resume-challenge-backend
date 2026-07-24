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
  // next dev does not auto-serve public/*/index.html at the directory URL
  async rewrites() {
    return [
      {
        source: "/maptiler-playground",
        destination: "/maptiler-playground/index.html",
      },
      {
        source: "/maptiler-playground/",
        destination: "/maptiler-playground/index.html",
      },
    ];
  },
};

export default nextConfig;
