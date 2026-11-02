/** @type {import('next').NextConfig} */
const isProduction = process.env.NODE_ENV === "production";
const repositoryName = "movieshub";
const repositoryBasePath = isProduction ? `/${repositoryName}` : "";

const nextConfig = {
  reactStrictMode: true,
  output: "export",
  basePath: repositoryBasePath,
  assetPrefix: repositoryBasePath,
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
