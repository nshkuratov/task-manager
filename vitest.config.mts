import path from "node:path";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

const src = path.resolve(import.meta.dirname, "src");

export default defineConfig({
  test: {
    projects: [
      {
        resolve: {
          alias: [
            { find: /^server-only$/, replacement: path.join(src, "test/server-only-stub.ts") },
            { find: /^@\//, replacement: `${src}/` },
          ],
        },
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.test.ts"],
          exclude: ["src/test/fixtures/**"],
          // Deadlines are UTC instants rendered in local time; a non-UTC zone makes offset bugs fail here.
          env: { TZ: "Europe/Amsterdam" },
        },
      },
      {
        plugins: [storybookTest({ configDir: path.resolve(import.meta.dirname, ".storybook") })],
        test: {
          name: "storybook",
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
});
