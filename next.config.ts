import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["mongodb"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "cdn.discordapp.com", pathname: "/avatars/**" }],
  },
  turbopack: {
    root: process.cwd(),
  },
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
