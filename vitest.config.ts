import { defineConfig } from "vitest/config";

// Deux environnements : serveur en node pur, UI en jsdom (Testing Library).
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "server",
          include: ["server/**/*.test.ts", "tests/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        test: {
          name: "ui",
          include: ["ui/**/*.test.{ts,tsx}", "tests/e2e/**/*.test.{ts,tsx}"],
          environment: "jsdom",
          setupFiles: ["ui/test-setup.ts"],
        },
      },
    ],
  },
});
