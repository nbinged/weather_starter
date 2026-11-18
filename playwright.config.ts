import { defineConfig } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

const port = 4317;
const testDataDir = join(tmpdir(), `weather-starter-playwright-${randomUUID()}`);
mkdirSync(testDataDir, { recursive: true });

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  reporter: 'list',
  outputDir: join(testDataDir, 'results'),
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    browserName: 'chromium',
    permissions: ['geolocation'],
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run build && node backend/dist/server.js',
    url: `http://127.0.0.1:${port}/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    env: {
      DATABASE_PATH: join(testDataDir, 'weather.db'),
      LOG_FILE_PATH: join(testDataDir, 'app.log'),
      NODE_ENV: 'production',
      PORT: String(port),
    },
  },
});
