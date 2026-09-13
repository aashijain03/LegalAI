import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    env: {
      NODE_ENV: "test",
      JWT_SECRET: "test-secret-key-for-vitest",
      CORS_ORIGIN: "http://localhost:5173",
    },
  },
});
