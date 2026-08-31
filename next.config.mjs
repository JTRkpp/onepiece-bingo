const isGithubPages = process.env.GITHUB_PAGES === "true";
const repo = "onepiece-bingo";
const basePath = isGithubPages ? `/${repo}` : "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  basePath,
  assetPrefix: basePath || undefined,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      fs: false,
      net: false,
      tls: false
    };
    return config;
  }
};

export default nextConfig;
