import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  webServer: [
    {
      command: 'node scripts/reset_sqlite_db.js && npm run start',
      cwd: './server',
      url: 'http://127.0.0.1:3230/api/health',
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        ...process.env,
        BOOTSTRAP_ADMIN_EMAIL: 'admin@securevault.local',
        BOOTSTRAP_ADMIN_NAME: 'E2E Admin',
        BOOTSTRAP_ADMIN_PASSWORD: 'SecureVaultAdmin#2026',
        CLIENT_NOTES_KEY: 'e2e-notes-key',
        CLIENT_VAULT_KEY: 'e2e-vault-key',
        CLIENT_CRYPTO_MANIFEST_PATH: 'tests/crypto-key-manifest.e2e.json',
        COOKIE_SECURE: 'false',
        DB_CLIENT: 'sqlite',
        MANDATORY_2FA_ROLES: '',
        SQLITE_DB_PATH: 'secure_vault.e2e.db',
        JWT_SECRET: 'e2e-jwt-secret',
        DISABLE_RATE_LIMIT: 'true',
        PORT: '3230',
      },
    },
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 6060',
      cwd: '.',
      url: 'http://127.0.0.1:6060',
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
  use: {
    baseURL: 'http://127.0.0.1:6060',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    serviceWorkers: 'block',
  },
});
