import type { NextConfig } from "next";

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  serverExternalPackages: ["postgres"],
  eslint: {
    ignoreDuringBuilds: true,
    dirs: ['src', 'app', 'components', 'lib', 'pages', 'styles']
  }
};

export default withBundleAnalyzer(nextConfig);
