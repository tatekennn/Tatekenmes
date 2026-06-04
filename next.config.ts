import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    devtoolSegmentExplorer: false,
    browserDebugInfoInTerminal: false,
  },
};

export default nextConfig;
