/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  // Enable standalone output for optimized Docker builds
  output: "standalone",
};

export default nextConfig;
