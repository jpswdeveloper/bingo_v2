import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Strict Mode is disabled because this app makes real side-effect API
  // calls and opens WebSocket connections inside effects. Strict Mode's
  // intentional double-invoke in development causes duplicate game joins,
  // double socket connections, and duplicate purchases.
  reactStrictMode: false,
  allowedDevOrigins: [
    // ngrok
    "*.ngrok-free.app",
    "*.ngrok.io",
    // cloudflare tunnels
    "*.trycloudflare.com",
    // localtunnel
    "*.loca.lt",
  ],
};

export default nextConfig;
