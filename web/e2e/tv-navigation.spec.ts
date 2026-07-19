import { expect, test } from '@playwright/test';

async function enterDemo(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await page.locator('#demo-button').click();
  await expect(page).toHaveURL(/#\/home/);
  await expect(page.locator('.app-shell')).toBeVisible();
}

test('parcours principal utilisable sans souris après l’entrée en démo', async ({ page }) => {
  await enterDemo(page);
  await page.keyboard.press('ArrowDown');
  const focused = page.locator(':focus');
  await expect(focused).toHaveAttribute('data-focusable', 'true');

  const movies = page.locator('[data-library-type="movies"]').first();
  await movies.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/library/);
  await expect(page.locator('#library-grid')).toBeVisible();

  const firstCard = page.locator('[data-open-item]').first();
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

test('les pages de catalogue restent sous le budget DOM bloquant', async ({ page }) => {
  await enterDemo(page);
  await page.locator('[data-library-type="movies"]').first().click();
  await expect(page.locator('#library-grid')).toBeVisible();
  const nodeCount = await page.locator('body *').count();
  expect(nodeCount).toBeLessThan(2_000);
});

test('le PIN du profil n’est jamais affiché dans le DOM ou les diagnostics', async ({ page }) => {
  await enterDemo(page);
  await page.evaluate(() => localStorage.setItem('wholphin-web-profile-pins-v1', JSON.stringify({ demo: { salt: 'AA==', hash: 'AA==', iterations: 1, failedAttempts: 0, blockedUntil: 0, updatedAt: new Date().toISOString() } })));
  await page.locator('[data-route="settings"]').click();
  const text = await page.locator('body').innerText();
  expect(text).not.toContain('AA==');
});
