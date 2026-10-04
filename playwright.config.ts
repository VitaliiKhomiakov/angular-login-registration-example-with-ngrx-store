import { defineConfig, devices } from '@playwright/test';

const built = process.env['E2E_BUILT'] === 'true';
const baseURL = built ? 'http://127.0.0.1:4201' : 'http://127.0.0.1:4200';
const acceptanceURL = 'http://127.0.0.1:4202';

export default defineConfig({
  testDir: './e2e',
  outputDir: built ? '.cache/playwright/builds' : '.cache/playwright/dev',
  testMatch: built
    ? '**/build-modes.spec.ts'
    : [
        '**/shell.spec.ts',
        '**/mock-api.spec.ts',
        '**/tasks-api.spec.ts',
        '**/tasks.spec.ts',
        '**/forms.spec.ts',
        '**/auth.spec.ts',
      ],
  fullyParallel: true,
  forbidOnly: Boolean(process.env['CI']),
  retries: 0,
  reporter: 'list',
  use: { baseURL, trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', testIgnore: '**/auth.spec.ts', use: { ...devices['Desktop Chrome'] } },
    ...(!built
      ? [
          {
            name: 'auth-acceptance',
            testMatch: '**/auth.spec.ts',
            use: { ...devices['Desktop Chrome'], baseURL: acceptanceURL },
          },
        ]
      : []),
  ],
  webServer: built
    ? {
        command: 'node e2e/serve-builds.ts',
        url: baseURL,
        reuseExistingServer: false,
        timeout: 120_000,
      }
    : [
        {
          command: 'npm start -- --host 127.0.0.1 --port 4200',
          url: baseURL,
          reuseExistingServer: false,
          timeout: 120_000,
        },
        {
          command: 'npm start -- --configuration acceptance --host 127.0.0.1 --port 4202',
          url: acceptanceURL,
          reuseExistingServer: false,
          timeout: 120_000,
        },
      ],
});
