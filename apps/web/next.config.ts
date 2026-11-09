import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@ponto-pro/core", "@ponto-pro/ui"],
  reactStrictMode: true,
  poweredByHeader: false,
};

export default config;
