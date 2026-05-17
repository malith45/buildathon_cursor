import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: frontendRoot,
  },
  // Allow HMR when opening the dev server via LAN IP (e.g. http://192.168.x.x:3000)
  allowedDevOrigins: [
    "192.168.8.146",
    "localhost",
    "127.0.0.1",
  ],
};

export default nextConfig;
