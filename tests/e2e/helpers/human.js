import { expect } from '@playwright/test';
import { createHmac } from 'node:crypto';

const CANDIDATE_CREDENTIALS = [
  { email: 'admin@securevault.com', password: 'admin123' },
  { email: 'admin@company.com', password: 'admin123' },
];

const NEW_USER_PASSWORD = 'E2eHuman#123';

export async function humanPause(page, min = 120, max = 320) {
  const jitter = Math.floor(Math.random() * (max - min + 1)) + min;
  await page.waitForTimeout(jitter);
}

export async function humanType(page, locator, text, clear = true) {
  await locator.click();
  await humanPause(page, 80, 180);

  if (clear) {
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await humanPause(page, 60, 140);
  }

  await locator.type(text, { delay: 45 });
  await humanPause(page, 120, 260);
}

export async function humanClick(page, locator) {
  await locator.scrollIntoViewIfNeeded();
  await locator.hover();
  await humanPause(page, 80, 180);
  await locator.click({ delay: 70 });
  await humanPause(page, 140, 300);
}

async function createFallbackUser(request) {
  const unique = Date.now();
  const fallback = {
    name: `E2E Human ${unique}`,
    email: `e2e.human.${unique}@example.com`,
    password: NEW_USER_PASSWORD,
  };

  const registerResponse = await request.post('/api/auth/register', {
    data: fallback,
  });

  expect(registerResponse.ok()).toBeTruthy();
  return { email: fallback.email, password: fallback.password };
}

export async function resolveCredentials(request) {
  for (const credentials of CANDIDATE_CREDENTIALS) {
    const response = await request.post('/api/auth/login', {
      data: credentials,
    });

    if (!response.ok()) continue;

    const data = await response.json();
    if (!data.requires2FA) return credentials;
  }

  return createFallbackUser(request);
}

export async function loginLikeHuman(page, request) {
  const credentials = await resolveCredentials(request);
  return loginWithCredentialsLikeHuman(page, credentials);
}

export async function loginWithCredentialsLikeHuman(page, credentials, options = {}) {
  const { twoFactorSecret } = options;

  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('login-submit')).toBeVisible();

  await humanType(page, page.getByTestId('login-email'), credentials.email);
  await humanType(page, page.getByTestId('login-password'), credentials.password);
  await humanClick(page, page.getByTestId('login-submit'));

  const has2FAChallenge = await page
    .getByTestId('login-2fa-code')
    .isVisible({ timeout: 2_500 })
    .catch(() => false);

  if (has2FAChallenge) {
    if (!twoFactorSecret) {
      throw new Error('Login requested 2FA but no twoFactorSecret was provided');
    }

    let solved = false;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const code = generateTotp(twoFactorSecret);
      await humanType(page, page.getByTestId('login-2fa-code'), code);
      await humanClick(page, page.getByTestId('login-submit'));

      const stillOnChallenge = await page
        .getByTestId('login-2fa-code')
        .isVisible({ timeout: 2_000 })
        .catch(() => false);

      if (!stillOnChallenge) {
        solved = true;
        break;
      }

      await page.waitForTimeout(900);
    }

    if (!solved) {
      throw new Error('Unable to complete 2FA challenge after multiple attempts');
    }
  }

  await page.waitForLoadState('networkidle');
  await expect(page).not.toHaveURL(/\/login$/);
  await expect(page.getByText(/bienvenido/i).first()).toBeVisible();

  return credentials;
}

export async function ensureUser(request, { name, email, password }) {
  const response = await request.post('/api/auth/register', {
    data: { name, email, password },
  });

  if (response.status() !== 400) {
    expect(response.ok()).toBeTruthy();
  }

  return { name, email, password };
}

export async function createPasswordLikeHuman(page, passwordData) {
  const {
    title,
    username = 'qa.user@example.com',
    password = 'HumanFlow#2026',
    url = '',
    owner = 'QA',
  } = passwordData;

  await humanClick(page, page.getByTestId('dashboard-new-password'));
  await expect(page.getByTestId('add-password-title')).toBeVisible();

  await humanType(page, page.getByTestId('add-password-title'), title);
  await humanType(page, page.getByTestId('add-password-username'), username);
  await humanType(page, page.getByTestId('add-password-password'), password);

  if (url) {
    await humanType(page, page.getByTestId('add-password-url'), url);
  }
  if (owner) {
    await humanType(page, page.getByTestId('add-password-owner'), owner);
  }

  await humanClick(page, page.getByTestId('add-password-save'));
  await expect(page.getByTestId('add-password-title')).toBeHidden();
}

export async function logoutLikeHuman(page) {
  await humanClick(page, page.getByTestId('nav-logout'));
  await expect(page).toHaveURL(/\/login$/);
}

export async function extractFirstBase32Secret(page) {
  const codeValues = await page.locator('code').allTextContents();
  const parsed = codeValues
    .map((value) => value.replace(/\s+/g, '').trim())
    .find((value) => /^[A-Z2-7]{16,}$/.test(value));

  if (!parsed) {
    throw new Error('Could not find a valid base32 secret in 2FA setup UI');
  }

  return parsed;
}

function decodeBase32(input) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = input.replace(/=+$/g, '').toUpperCase().replace(/\s+/g, '');
  let bits = '';

  for (const char of clean) {
    const value = alphabet.indexOf(char);
    if (value < 0) continue;
    bits += value.toString(2).padStart(5, '0');
  }

  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(Number.parseInt(bits.slice(i, i + 8), 2));
  }

  return Buffer.from(bytes);
}

export function generateTotp(secretBase32, timestamp = Date.now()) {
  const key = decodeBase32(secretBase32);
  const counter = Math.floor(timestamp / 30_000);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  const hmac = createHmac('sha1', key).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = (
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  ) % 1_000_000;

  return String(code).padStart(6, '0');
}
