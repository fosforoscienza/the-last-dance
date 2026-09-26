import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Le immagini dei QR della caccia al tesoro vengono lette dal server a runtime
  outputFileTracingIncludes: {
    "/api/treasure/*": ["./caccia-al-tesoro/qr/**/*"],
  },
};

export default nextConfig;
