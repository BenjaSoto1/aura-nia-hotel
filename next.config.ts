import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "node-cron", "googleapis", "nodemailer"],
  images: { unoptimized: true },
  // Archivos que se leen en tiempo de ejecución (útil si se compila en modo standalone).
  outputFileTracingIncludes: {
    "/**": ["./hotel-pack.yaml", "./prisma/aura.db", "./node_modules/.prisma/client/**/*"],
  },
};

export default nextConfig;
