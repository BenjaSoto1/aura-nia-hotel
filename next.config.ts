import type { NextConfig } from "next";

// En Netlify el contenedor de build tiene poca memoria y la verificación de tipos (googleapis es enorme)
// lo agota. Los tipos y las pruebas se verifican en local (`npx tsc --noEmit`, `npm run test`).
const onNetlify = process.env.NETLIFY === "true";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "node-cron", "googleapis", "nodemailer"],
  images: { unoptimized: true },
  typescript: { ignoreBuildErrors: onNetlify },
  eslint: { ignoreDuringBuilds: onNetlify },
  // Archivos que se leen en tiempo de ejecución y deben viajar con las funciones (Netlify / standalone).
  outputFileTracingIncludes: {
    "/**": ["./hotel-pack.yaml", "./node_modules/.prisma/client/**/*"],
  },
};

export default nextConfig;
