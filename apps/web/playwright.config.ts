import { defineConfig, devices } from "@playwright/test";

const PORTA = 3100;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORTA}`,
    trace: "off",
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
  },
  projects: [{ name: "android", use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } } }],
  webServer: {
    command: `pnpm next start -p ${PORTA}`,
    port: PORTA,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
