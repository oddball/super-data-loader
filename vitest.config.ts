import { defineConfig, configDefaults } from "vitest/config";

export default defineConfig({
  resolve: {
    extensions: [".ts", ".js", ".mjs"],
  },
  test: {
    watch: false,
    include: ["**/*{test,spec}.?(c|m)[jt]s?(x)"],
    environment: "node",
    setupFiles: ["./src/setupTests.ts"],
    coverage: {
      provider: "v8", // istanbul or 'v8'
      reportOnFailure: false,
      exclude: [
        ...configDefaults.exclude,
        "build.js",
        "**/index.ts",
        "**/types.ts",
        "**/*.types.ts",
        "**/*.generated.ts",
        "**/__mocks__/**",
        "**/*{test,spec}.?(c|m)[jt]s?(x)",
        "static/**",
        "scripts/**",
      ],
    },
    reporters: ["verbose"],
    testTimeout: 7000,
    teardownTimeout: 1000,
    pool: "forks",
  },
});
