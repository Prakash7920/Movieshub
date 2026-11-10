import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
  test: { environment: "node", include: ["tests/**/*.test.ts"], exclude: ["tests/rate-limit.integration.test.ts", "tests/security-primitives.test.ts"], restoreMocks: true },
});
