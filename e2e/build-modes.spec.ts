import { expect, test } from '@playwright/test';

test('optimized demo works under a subpath, then remote reload stops mocking', async ({
  page,
  context,
}) => {
  await page.goto('/demo/');
  await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
  expect(await page.evaluate(() => 'authAcceptance' in window)).toBe(false);
  expect(
    await page.evaluate(
      async () =>
        (await fetch('/api/profile', { headers: { Authorization: 'Bearer demo-token' } })).status,
    ),
  ).toBe(200);
  const scopes = await page.evaluate(async () =>
    (await navigator.serviceWorker.getRegistrations()).map((registration) => registration.scope),
  );
  expect(scopes).toEqual(['http://127.0.0.1:4201/demo/']);
  await page.getByLabel('Email or phone number').fill('demo@example.test');
  await page.getByLabel('Password', { exact: true }).fill('demo-password');
  await page.getByLabel('Password', { exact: true }).press('Enter');
  await expect(page.getByText('Demo User', { exact: true })).toBeVisible();
  await expect(page.getByRole('status')).toHaveCount(0);
  await page.reload();
  await expect(page.getByText('Demo User', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'My tasks', exact: true }).click();
  await expect(page).toHaveURL('/demo/tasks');
  await expect(page.getByRole('heading', { name: 'My tasks', exact: true })).toBeVisible();
  await expect(page.getByTestId('task-counts')).toHaveText('2 remaining of 3');
  await page
    .getByRole('button', { name: 'Mark complete: Review the feature structure', exact: true })
    .click();
  await expect(page.getByTestId('task-counts')).toHaveText('1 remaining of 3');
  await page.getByRole('link', { name: 'Profile', exact: true }).click();
  await expect(page.getByText('Demo User', { exact: true })).toBeVisible();
  await context.addCookies([{ name: 'test-build', value: 'remote', url: 'http://127.0.0.1:4201' }]);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
  expect(await page.evaluate(() => 'authAcceptance' in window)).toBe(false);
  expect(
    await page.evaluate(
      async () =>
        (await fetch('/api/profile', { headers: { Authorization: 'Bearer demo-token' } })).status,
    ),
  ).toBe(404);
  expect(await page.evaluate(async () => (await fetch('/api/unknown')).status)).toBe(404);
});

test('cold remote startup registers no worker', async ({ page, context }) => {
  await context.addCookies([{ name: 'test-build', value: 'remote', url: 'http://127.0.0.1:4201' }]);
  await page.goto('/demo/');
  await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
  expect(await page.evaluate(() => 'authAcceptance' in window)).toBe(false);
  expect(
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length),
  ).toBe(0);
  expect(await page.evaluate(async () => (await fetch('/api/profile')).status)).toBe(404);
});

test('worker failure prevents bootstrap and displays an error', async ({ browser }) => {
  const context = await browser.newContext({ serviceWorkers: 'block' });
  try {
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:4201/demo/');
    await expect(page.getByRole('alert')).toContainText('Unable to start the application');
    await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toHaveCount(0);
  } finally {
    await context.close();
  }
});
