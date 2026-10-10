import { defineConfig, devices } from '@playwright/test';

const PORT = 4321;
// SwiftShader gives headless Chromium a software WebGL2 implementation.
const webgl = { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] };

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  workers: process.env.CI ? undefined : 4,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: `http://localhost:${PORT}`, trace: 'retain-on-failure' },
  webServer: {
    command: `pnpm build && pnpm preview --port ${PORT}`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'], launchOptions: webgl } },
    { name: 'android-chromium', use: { ...devices['Pixel 7'], launchOptions: webgl } },
    { name: 'iphone-webkit', use: { ...devices['iPhone 13'] } },
  ],
});
