import { expect, test, type Page, type TestInfo } from '@playwright/test';

async function enterDemo(page: Page): Promise<void> {
  await page.goto('/');
  await page.locator('#demo-button').click();
  await expect(page).toHaveURL(/#\/home/);
  await expect(page.locator('.app-shell')).toBeVisible();
}

async function openMovies(page: Page): Promise<void> {
  const movies = page.locator('[data-library-type="movies"]').first();
  await movies.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/library/);
  await expect(page.locator('#library-grid')).toBeVisible();
}

async function attachScreenshot(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  await page.evaluate(async () => { await document.fonts.ready; });
  const body = await page.screenshot({ fullPage: true, animations: 'disabled' });
  await testInfo.attach(`${name}-${testInfo.project.name}`, { body, contentType: 'image/png' });
}

test('parcours principal utilisable sans souris après l’entrée en démo', async ({ page }) => {
  await enterDemo(page);
  await page.keyboard.press('ArrowDown');
  await expect(page.locator(':focus')).toHaveAttribute('data-focusable', 'true');
  await openMovies(page);

  const firstCard = page.locator('#library-grid [data-open-item]').first();
  await firstCard.focus();
  const focusKey = await firstCard.getAttribute('data-focus-key');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/item/);
  await expect(page.locator('.detail-content h1')).toBeVisible();

  await page.keyboard.press('Backspace');
  await expect(page).toHaveURL(/#\/library/);
  if (focusKey) await expect(page.locator(':focus')).toHaveAttribute('data-focus-key', focusKey);
});

test('Retour ouvre puis ferme le tiroir sur l’accueil', async ({ page }) => {
  await enterDemo(page);
  await page.keyboard.press('Backspace');
  await expect(page.locator('.app-shell')).toHaveClass(/drawer-expanded/);
  await expect(page.locator(':focus')).toHaveAttribute('data-focus-key', 'nav:home');
  await page.keyboard.press('Backspace');
  await expect(page.locator('.app-shell')).not.toHaveClass(/drawer-expanded/);
});

test('le tiroir replié ne masque ni ne capture le contenu', async ({ page }) => {
  await enterDemo(page);
  await openMovies(page);
  const drawer = page.locator('.side-nav');
  const card = page.locator('#library-grid [data-open-item]').first();
  await expect(drawer).not.toHaveClass(/expanded/);
  await expect(card).toBeVisible();
  await card.click();
  await expect(page).toHaveURL(/#\/item/);
});

test('les préférences de bibliothèque sont persistantes par profil', async ({ page }) => {
  await enterDemo(page);
  await openMovies(page);
  await page.locator('[data-library-view="list"]').click();
  await expect(page.locator('.media-list-item').first()).toBeVisible();
  const advanced = page.locator('.library-advanced');
  if (!(await advanced.getAttribute('open'))) await advanced.locator('summary').click();
  await page.locator('#library-image').selectOption('landscape');
  await page.locator('#library-size').selectOption('compact');
  await page.reload();
  await expect(page.locator('[data-library-view="list"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#library-image')).toHaveValue('landscape');
  await expect(page.locator('#library-size')).toHaveValue('compact');
});

test('les pages de catalogue restent sous le budget DOM bloquant', async ({ page }) => {
  await enterDemo(page);
  await openMovies(page);
  const nodeCount = await page.locator('body *').count();
  expect(nodeCount).toBeLessThan(2_000);
});

test('le PIN du profil n’est jamais affiché dans le DOM ou les diagnostics', async ({ page }) => {
  await enterDemo(page);
  await page.evaluate(() => localStorage.setItem('wholphin-web-profile-pins-v1', JSON.stringify({ demo: { salt: 'AA==', hash: 'AA==', iterations: 1, failedAttempts: 0, blockedUntil: 0, updatedAt: new Date().toISOString() } })));
  const settings = page.locator('[data-focus-key="nav:settings"]');
  await settings.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/settings/);
  const text = await page.locator('body').innerText();
  expect(text).not.toContain('AA==');
});

test('produit des captures de référence 720p et 1080p', async ({ page }, testInfo) => {
  await enterDemo(page);
  await attachScreenshot(page, testInfo, 'home');
  await openMovies(page);
  await attachScreenshot(page, testInfo, 'library-grid');
  const firstCard = page.locator('#library-grid [data-open-item]').first();
  await firstCard.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.detail-content h1')).toBeVisible();
  await attachScreenshot(page, testInfo, 'detail');
});
