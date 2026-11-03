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
  // El sitio del hotel es el diseño "Aura · Nía Mode" (Claude Design), servido como estático desde
  // public/aura/ y conectado al core con public/aura/nia-bridge.js. Se genera con scripts/build-aura-page.py.
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/", destination: "/aura/index.html" },
        { source: "/canal/web", destination: "/aura/index.html" },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  async headers() {
    return [
      { source: "/aura/uploads/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }] },
      // La página y el puente cambian con cada deploy: siempre frescos.
      { source: "/aura/:file(index.html|nia-bridge.js)", headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }] },
    ];
  },
};

export default nextConfig;
