import type { NextConfig } from "next";

const playgroundDirs = [
  "maptiler-playground",
  "mapbox-playground",
  "esri-playground",
  "google-maps-playground",
  "aws-playground",
  "azure-playground",
  "gcp-playground",
];

const playgroundRewrites = playgroundDirs.flatMap((dir) => [
  { source: `/${dir}`, destination: `/${dir}/index.html` },
  { source: `/${dir}/`, destination: `/${dir}/index.html` },
]);

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
    return playgroundRewrites;
  },
};

export default nextConfig;
