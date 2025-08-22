import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["postgres"],
  eslint: {
    ignoreDuringBuilds: false,
    dirs: ['src', 'app', 'components', 'lib', 'pages', 'styles']
  }
};

export default nextConfig;
