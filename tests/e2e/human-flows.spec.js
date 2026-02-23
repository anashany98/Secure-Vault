import { expect, test } from '@playwright/test';
import {
  createPasswordLikeHuman,
  ensureUser,
  extractFirstBase32Secret,
  generateTotp,
  humanClick,
  humanPause,
  humanType,
  loginLikeHuman,
  loginWithCredentialsLikeHuman,
  logoutLikeHuman,
} from './helpers/human';

function uniqueSuffix() {
  return `${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
}

test.describe('Flujos humanos de la web', () => {
  test('login humano y apertura/cierre de modal de nueva contraseña', async ({ page, request }) => {
    await loginLikeHuman(page, request);

    await expect(page.getByRole('heading', { name: /mi b|b[óo]veda/i }).first()).toBeVisible();

    await humanClick(page, page.getByTestId('dashboard-new-password'));
    await expect(page.getByTestId('add-password-title')).toBeVisible();

    await humanType(page, page.getByTestId('add-password-title'), 'GitHub');
    await humanType(page, page.getByTestId('add-password-username'), 'qa-user@example.com');
    await humanType(page, page.getByTestId('add-password-password'), 'SuperSecret#2026');
    await humanPause(page, 200, 350);

    await humanClick(page, page.getByTestId('add-password-cancel'));
    await expect(page.getByTestId('add-password-title')).toBeHidden();
  });

  test('navegación principal, búsqueda y logout con ritmo humano', async ({ page, request }) => {
    const title = `Shared Portal ${uniqueSuffix()}`;

    await loginLikeHuman(page, request);
    await createPasswordLikeHuman(page, {
      title,
      username: 'shared.portal@example.com',
      password: 'Shared#2026!',
      owner: 'QA Shared',
    });

    await humanClick(page, page.getByTestId('nav-inventory'));
    await expect(page.getByRole('heading', { name: /inventario corporativo/i }).first()).toBeVisible();

    await humanClick(page, page.getByTestId('nav-notes'));
    await expect(page.getByRole('heading', { name: /notas seguras/i }).first()).toBeVisible();

    await humanClick(page, page.getByTestId('nav-settings'));
    await expect(page.getByRole('heading', { name: /ajustes del sistema/i }).first()).toBeVisible();

    await humanClick(page, page.getByTestId('nav-sessions'));
    await expect(page.getByRole('heading', { name: /gesti[oó]n de sesiones/i }).first()).toBeVisible();

    await page.keyboard.press('Control+K');
    await expect(page.getByPlaceholder(/buscar contraseñas/i)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByPlaceholder(/buscar contraseñas/i)).toBeHidden();

    await humanClick(page, page.getByTestId('nav-all-passwords'));
    await expect(page.getByRole('heading', { name: /mi b|b[óo]veda/i }).first()).toBeVisible();

    await humanType(page, page.getByTestId('dashboard-quick-search'), 'Shared Portal');
    await expect(page.getByText(title).first()).toBeVisible();

    await humanClick(page, page.getByTestId('nav-logout'));
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByTestId('login-submit')).toBeVisible();
  });

  test('compartir enlace público y consumirlo una sola vez', async ({ page, request }) => {
    const title = `Public Share ${uniqueSuffix()}`;
    await loginLikeHuman(page, request);
    await createPasswordLikeHuman(page, {
      title,
      username: 'share@example.com',
      password: 'Share#2026!',
      owner: 'QA Share',
    });

    await humanType(page, page.getByTestId('dashboard-quick-search'), title);
    const card = page.locator('[data-testid^="password-card-"]').filter({ hasText: title }).first();
    await expect(card).toBeVisible();

    const shareRequest = page.waitForResponse((response) =>
      response.request().method() === 'POST' && response.url().includes('/api/shares')
    );

    await humanClick(page, card.locator('[data-testid^="password-share-"]').first());
    await expect(page.getByTestId('public-share-generate')).toBeVisible();
    await humanClick(page, page.getByTestId('public-share-generate'));

    const shareResponse = await shareRequest;
    expect(shareResponse.ok()).toBeTruthy();
    const { id } = await shareResponse.json();
    expect(id).toBeTruthy();
    await expect(page.getByTestId('public-share-copy-link')).toBeVisible();

    const sharePage = await page.context().newPage();
    await sharePage.goto(`/share/${id}`, { waitUntil: 'domcontentloaded' });
    await expect(sharePage.getByRole('button', { name: /revelar secreto ahora/i })).toBeVisible();
    await sharePage.getByRole('button', { name: /revelar secreto ahora/i }).click();
    await expect(sharePage.getByText(title)).toBeVisible();
    await sharePage.close();

    const secondTryPage = await page.context().newPage();
    await secondTryPage.goto(`/share/${id}`, { waitUntil: 'domcontentloaded' });
    await expect(secondTryPage.getByText(/enlace no válido/i)).toBeVisible();
    await secondTryPage.close();
  });

  test('exportar e importar backup desde ajustes', async ({ page, request }) => {
    const importTitle = `CSV Import ${uniqueSuffix()}`;
    await loginLikeHuman(page, request);

    await humanClick(page, page.getByTestId('nav-settings'));
    await expect(page.getByRole('heading', { name: /ajustes del sistema/i })).toBeVisible();

    await humanClick(page, page.getByTestId('settings-open-export'));
    await expect(page.getByTestId('export-submit')).toBeVisible();
    await humanType(page, page.getByTestId('export-password'), 'BackupPass#2026');
    await humanType(page, page.getByTestId('export-password-confirm'), 'BackupPass#2026');

    const downloadPromise = page.waitForEvent('download');
    await humanClick(page, page.getByTestId('export-submit'));
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/secure-vault-backup-\d{4}-\d{2}-\d{2}\.json/i);

    await humanClick(page, page.getByTestId('settings-open-restore'));
    await expect(page.getByTestId('import-submit')).toBeVisible();

    const csvData = [
      'title,username,password,url,notes',
      `${importTitle},import.user@example.com,Import#2026!,https://import.local,Equipo QA`,
    ].join('\n');

    await page.getByTestId('import-file-input').setInputFiles({
      name: 'human-import.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvData, 'utf8'),
    });

    const importRequest = page.waitForResponse((response) =>
      response.request().method() === 'POST' && response.url().includes('/api/vault/import')
    );

    await humanClick(page, page.getByTestId('import-submit'));
    const importResponse = await importRequest;
    expect(importResponse.ok()).toBeTruthy();

    await page.waitForTimeout(1_500);
    await page.waitForLoadState('domcontentloaded');

    await humanClick(page, page.getByTestId('nav-all-passwords'));
    await humanType(page, page.getByTestId('dashboard-quick-search'), importTitle);
    await expect(page.getByText(importTitle).first()).toBeVisible();
  });

  test('enviar a papelera y restaurar contraseña', async ({ page, request }) => {
    const title = `Trash Restore ${uniqueSuffix()}`;
    await loginLikeHuman(page, request);
    await createPasswordLikeHuman(page, {
      title,
      username: 'trash.restore@example.com',
      password: 'Trash#2026!',
      owner: 'QA Trash',
    });

    await humanType(page, page.getByTestId('dashboard-quick-search'), title);
    const card = page.locator('[data-testid^="password-card-"]').filter({ hasText: title }).first();
    await expect(card).toBeVisible();
    await humanClick(page, card.locator('[data-testid^="password-delete-"]').first());

    await humanClick(page, page.getByTestId('nav-trash'));
    await expect(page.getByRole('heading', { name: /papelera de reciclaje/i })).toBeVisible();

    const trashItem = page.locator('[data-testid^="trash-item-passwords-"]').filter({ hasText: title }).first();
    await expect(trashItem).toBeVisible();
    await humanClick(page, trashItem.locator('[data-testid^="trash-restore-passwords-"]').first());

    await expect(
      page.locator('[data-testid^="trash-item-passwords-"]').filter({ hasText: title })
    ).toHaveCount(0);

    await humanClick(page, page.getByTestId('nav-all-passwords'));
    await humanType(page, page.getByTestId('dashboard-quick-search'), title);
    await expect(page.getByText(title).first()).toBeVisible();
  });

  test('activar 2FA y volver a entrar con código TOTP', async ({ page, request }) => {
    const suffix = uniqueSuffix();
    const credentials = await ensureUser(request, {
      name: `2FA User ${suffix}`,
      email: `twofa.${suffix}@example.com`,
      password: 'TwoFa#2026!',
    });

    await loginWithCredentialsLikeHuman(page, credentials);

    await humanClick(page, page.getByTestId('nav-settings'));
    await humanClick(page, page.getByTestId('settings-tab-security'));
    await humanClick(page, page.getByTestId('twofa-start-setup'));
    await expect(page.getByTestId('twofa-token-input')).toBeVisible();

    const secret = await extractFirstBase32Secret(page);
    await humanType(page, page.getByTestId('twofa-token-input'), generateTotp(secret));
    await humanClick(page, page.getByTestId('twofa-verify-enable'));
    await expect(page.getByTestId('twofa-finish')).toBeVisible();
    await humanClick(page, page.getByTestId('twofa-finish'));

    await logoutLikeHuman(page);
    await loginWithCredentialsLikeHuman(page, credentials, { twoFactorSecret: secret });
    await expect(page.getByRole('heading', { name: /mi b|b[óo]veda/i }).first()).toBeVisible();
  });

  test('usuario no admin no ve pestaña de gestión de usuarios', async ({ page, request }) => {
    const suffix = uniqueSuffix();
    const credentials = await ensureUser(request, {
      name: `Role User ${suffix}`,
      email: `role.${suffix}@example.com`,
      password: 'Role#2026!',
    });

    await loginWithCredentialsLikeHuman(page, credentials);
    await humanClick(page, page.getByTestId('nav-settings'));
    await expect(page.getByRole('heading', { name: /ajustes del sistema/i })).toBeVisible();
    await expect(page.getByTestId('settings-tab-users')).toHaveCount(0);
    await expect(page.getByTestId('settings-tab-security')).toBeVisible();
  });
});
