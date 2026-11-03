import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
  // Next usa jsx: "preserve"; en los tests transformamos JSX (correos de React Email)
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    environment: "node",
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 60000,
    env: {
      DATABASE_URL: "file:./test.db",
      AGENT_MODE: "guided",
      EMAIL_PROVIDER: "simulated",
      STRIPE_SECRET_KEY: "",
      GOOGLE_CLIENT_ID: "",
      ANTHROPIC_API_KEY: "",
      INSTAGRAM_ACCESS_TOKEN: "",
      INSTAGRAM_APP_SECRET: "",
      WHATSAPP_OUTBOUND_WEBHOOK_URL: "",
    },
    globalSetup: "./tests/global-setup.ts",
  },
});
