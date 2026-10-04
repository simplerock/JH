import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lappar och PDF:er skickas till servern för AI-inläsning.
  experimental: { serverActions: { bodySizeLimit: "12mb" } },
};

export default nextConfig;
