/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Vercel runs the full Next.js server. Do not use static export or a GitHub Pages basePath.
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
