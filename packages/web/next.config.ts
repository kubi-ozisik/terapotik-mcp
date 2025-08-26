import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Handle Prisma client in monorepo setup
  serverExternalPackages: ["@prisma/client", "@prisma/engines"],
  
  // Ensure workspace packages are transpiled
  transpilePackages: ["@terapotik/shared"],
  
  // Webpack config for Prisma
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push({
        "@prisma/client": "commonjs @prisma/client",
        "@prisma/engines": "commonjs @prisma/engines",
      });
    }
    return config;
  },
};

export default nextConfig;
