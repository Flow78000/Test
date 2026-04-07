import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow flow.localhost as hostname
  allowedDevOrigins: ["flow.localhost"],
};

export default nextConfig;
