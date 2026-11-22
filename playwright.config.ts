import { defineConfig } from "@playwright/test";

const origin = process.env.MENU_QA_BASE_URL;
const localOrigin = "http://127.0.0.1:3174";

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  timeout: 45_000,
  workers: 2,
  use: {
    baseURL: origin || localOrigin,
    browserName: "chromium",
    channel: process.env.MENU_QA_CHROME_CHANNEL,
  },
  webServer: origin ? undefined : {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3174",
    url: localOrigin,
    timeout: 120_000,
  },
});
