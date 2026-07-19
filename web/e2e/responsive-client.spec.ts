import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';

async function firstVisible(page: Page, selector: string): Promise<Locator> {
  const candidates = page.locator(selector);
  for (let index = 0; index < await candidates.count(); index += 1) {
    const candidate = candidates.nth(index);
    if (await candidate.isVisible()) return candidate;
  }
  throw new Error(`Aucun élément visible pour ${selector}`);
}

async function enterDemo(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator('#server-form')).toBeVisible();
  await expect(page.locator('#account-step')).toBeHidden();
  await page.locator('#demo-button').click();
  await expect(page).toHaveURL(/#\/home/);
  await expect(page.locator('.app-shell')).toBeVisible();
}

async function openMovies(page: Page): Promise<void> {
  const movies = await firstVisible(page, '[data-library-type="movies"]');
  await movies.click();
  await expect(page).toHaveURL(/#\/library/);
  await expect(page.locator('#library-grid')).toBeVisible();
}

async function openSettings(page: Page): Promise<void> {
  const directSettings = page.locator('[data-route="settings"]');
  for (let index = 0; index < await directSettings.count(); index += 1) {
    if (await directSettings.nth(index).isVisible()) {
      await directSettings.nth(index).click();
      await expect(page).toHaveURL(/#\/settings/);
      return;
    }
  }
  const more = page.locator('.mobile-more');
  await more.locator('summary').click();
  await firstVisible(page, '.mobile-more-sheet [data-route="settings"]').then((button) => button.click());
  await expect(page).toHaveURL(/#\/settings/);
}

async function attachScreenshot(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  await page.evaluate(async () => { await document.fonts.ready; });
  const body = await page.screenshot({ fullPage: true, animations: 'disabled' });
  await testInfo.attach(`${name}-${testInfo.project.name}`, { body, contentType: 'image/png' });
}

test('la connexion est présentée en deux étapes partageables', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#server-form')).toBeVisible();
  await expect(page.locator('#server')).toHaveAttribute('placeholder', /jellyfin/);
  await expect(page.locator('#account-step')).toBeHidden();
  await expect(page.locator('[data-step-indicator="server"]')).toHaveClass(/active/);
});

test('le shell choisit une navigation adaptée au format de fenêtre', async ({ page }, testInfo) => {
  await enterDemo(page);
  const isDesktop = testInfo.project.name === 'chromium-desktop';
  if (isDesktop) {
    await expect(page.locator('.side-nav')).toBeVisible();
    await expect(page.locator('.mobile-nav')).toBeHidden();
  } else {
    await expect(page.locator('.side-nav')).toBeHidden();
    await expect(page.locator('.mobile-nav')).toBeVisible();
  }
});

test('le parcours accueil, bibliothèque et fiche fonctionne à la souris ou au tactile', async ({ page }) => {
  await enterDemo(page);
  await openMovies(page);
  const firstCard = page.locator('#library-grid [data-open-item]').first();
  await expect(firstCard).toBeVisible();
  await firstCard.click();
  await expect(page).toHaveURL(/#\/item/);
  await expect(page.locator('.detail-content h1')).toBeVisible();
});

test('le bureau reste utilisable entièrement au clavier', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Le test clavier complet cible le format bureau.');
  await enterDemo(page);
  const movies = await firstVisible(page, '[data-library-type="movies"]');
  await movies.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/library/);
  const firstCard = page.locator('#library-grid [data-open-item]').first();
  await firstCard.focus();
  const focusKey = await firstCard.getAttribute('data-focus-key');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/item/);
  await page.keyboard.press('Alt+ArrowLeft');
  await expect(page).toHaveURL(/#\/library/);
  if (focusKey) await expect(page.locator(':focus')).toHaveAttribute('data-focus-key', focusKey);
});

test('les préférences de bibliothèque persistent par profil', async ({ page }) => {
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

test('le catalogue reste sous le budget DOM', async ({ page }) => {
  await enterDemo(page);
  await openMovies(page);
  expect(await page.locator('body *').count()).toBeLessThan(2_000);
});

test('aucun format responsive ne provoque de débordement horizontal global', async ({ page }) => {
  await enterDemo(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(2);
});

test('le PIN du profil reste absent du DOM et des diagnostics', async ({ page }) => {
  await enterDemo(page);
  await page.evaluate(() => localStorage.setItem('wholphin-web-profile-pins-v1', JSON.stringify({ demo: { salt: 'AA==', hash: 'AA==', iterations: 1, failedAttempts: 0, blockedUntil: 0, updatedAt: new Date().toISOString() } })));
  await openSettings(page);
  expect(await page.locator('body').innerText()).not.toContain('AA==');
});

test('produit des captures de référence responsive', async ({ page }, testInfo) => {
  await enterDemo(page);
  await attachScreenshot(page, testInfo, 'home');
  await openMovies(page);
  await attachScreenshot(page, testInfo, 'library-grid');
  await page.locator('#library-grid [data-open-item]').first().click();
  await expect(page.locator('.detail-content h1')).toBeVisible();
  await attachScreenshot(page, testInfo, 'detail');
});
