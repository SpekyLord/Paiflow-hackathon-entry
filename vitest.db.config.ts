import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// DB tests run the real SQL on the dedicated test project inside rolled-back
// transactions. Not part of `npm test`; run with `npm run test:db`.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["tests/db/**/*.db.test.ts"],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
});
