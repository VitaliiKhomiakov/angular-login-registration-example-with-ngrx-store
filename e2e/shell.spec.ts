import { expect, test } from '@playwright/test';

for (const url of ['/', '/auth/login', '/missing/page']) {
  test(`boots and redirects ${url} without external configuration`, async ({ page }) => {
    const errors: string[] = [];
    const configRequests: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', (request) => {
      if (/config\.(dev|prod)\.json/.test(request.url())) {
        configRequests.push(request.url());
      }
    });

    await page.goto(url);
    await expect(page).toHaveURL('/auth/login');
    await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
    expect(await page.evaluate(() => 'Zone' in globalThis)).toBe(false);
    expect(await page.evaluate(() => 'authAcceptance' in window)).toBe(false);
    expect(configRequests).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test('protected shell redirects an anonymous session without requesting profile', async ({
  page,
}) => {
  const profiles: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/profile') profiles.push(request.url());
  });
  await page.goto('/profile');
  await expect(page).toHaveURL('/auth/login');
  await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
  expect(profiles).toEqual([]);
});

test('bootstrap restores a seeded demo token through MSW before protected routing and after reload', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.addInitScript(() =>
    sessionStorage.setItem('angular-ngrx-demo.session-token', 'demo-token'),
  );
  await page.goto('/profile');
  await expect(page).toHaveURL('/profile');
  await expect(page.getByRole('heading', { name: 'Profile', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Profile', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('invalid persisted token is cleared and protected routing ends on login', async ({ page }) => {
  await page.addInitScript(() =>
    sessionStorage.setItem('angular-ngrx-demo.session-token', 'invalid-token'),
  );
  await page.goto('/profile');
  await expect(page).toHaveURL('/auth/login');
  await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
  expect(
    await page.evaluate(() => sessionStorage.getItem('angular-ngrx-demo.session-token')),
  ).toBeNull();
});
