import { defineConfig, devices } from '@playwright/test';

// The e2e tests run against a production build on its own port, so they don't clash with
// `npm run dev` on 3000. Keycloak and RAGdoll are replaced by e2e/support/mock-backend.mjs.
// See docs/e2e-testing.md.
const APP_PORT = 3100;
const MOCK_PORT = 8181;
const appUrl = `http://localhost:${APP_PORT}`;
const mockUrl = `http://localhost:${MOCK_PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // Fail CI if someone leaves test.only in the code.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // With two retries, a change that breaks many tests would otherwise keep CI busy until the
  // job's timeout. Stop early instead: ten failures say enough.
  maxFailures: process.env.CI ? 10 : undefined,
  // Each test has its own user in the mock backend, so tests can run side by side. The GitHub
  // runner has few cores, and the app server and browsers share them, so two is enough there.
  workers: process.env.CI ? 2 : undefined,
  reporter: 'html',
  use: {
    baseURL: appUrl,
    // Record a trace when a failed test is retried. See https://playwright.dev/docs/trace-viewer
    trace: 'on-first-retry',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],

  webServer: [
    {
      command: 'node e2e/support/mock-backend.mjs',
      url: `${mockUrl}/health`,
      env: { MOCK_BACKEND_PORT: String(MOCK_PORT) },
      reuseExistingServer: !process.env.CI,
    },
    {
      // A production build, because a second `next dev` can't run next to yours.
      command: `npm run build && npx next start -p ${APP_PORT}`,
      url: appUrl,
      timeout: 300_000,
      reuseExistingServer: !process.env.CI,
      // These win over .env, so the app talks to the mock, never to a real backend.
      env: {
        BACKEND_API_URL: mockUrl,
        RAGDOLL_API_URL: mockUrl,
        RAGDOLL_CONFIGURATOR_AGENT_ID: 'mock-configurator',
        RAGDOLL_CONFIGURATOR_ACCESS_KEY: 'mock-access-key',
        RAGDOLL_OBSERVER_AGENT_ID: 'mock-observer',
        RAGDOLL_OBSERVER_ACCESS_KEY: 'mock-access-key',
        NEXTAUTH_URL: appUrl,
        NEXTAUTH_SECRET: 'e2e-only-secret-not-used-anywhere-else',
        KEYCLOAK_CLIENT_ID: 'ragdoll-config',
        KEYCLOAK_CLIENT_SECRET: 'mock-client-secret',
        KEYCLOAK_ISSUER: `${mockUrl}/realms/ragdoll`,
        IDUN_API_KEY: 'mock-idun-key',
      },
    },
  ],
});
