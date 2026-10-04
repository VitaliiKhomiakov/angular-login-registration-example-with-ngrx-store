import { expect, test } from '@playwright/test';

test('cold startup serves login/profile and diagnoses own API while assets pass', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
  const result = await page.evaluate(async () => {
    const login = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrPhone: 'demo@example.test', password: 'demo-password' }),
    });
    const profile = await fetch('/api/profile', {
      headers: { Authorization: 'Bearer demo-token' },
    });
    return {
      login: await login.text(),
      profile: await profile.text(),
      unknown: (await fetch('/api/missing')).status,
      asset: (await fetch('/mockServiceWorker.js')).status,
      unauthorized: (await fetch('/api/profile')).status,
    };
  });
  expect(JSON.parse(result.login)).toEqual({ accessToken: 'demo-token' });
  expect(JSON.parse(result.profile)).toMatchObject({ email: 'demo@example.test' });
  expect(result.unknown).toBe(501);
  expect(result.asset).toBe(200);
  expect(result.unauthorized).toBe(401);
  expect(errors).toEqual([]);
});

test('registration works for this page and resets on reload', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
  const result = await page.evaluate(async () => {
    const registration = {
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.test',
      password: 'new-password',
      confirmPassword: 'new-password',
    };
    const post = (path: string, body: unknown) =>
      fetch(`/api${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    const created = await post('/auth/sign-up', registration);
    const duplicate = await post('/auth/sign-up', registration);
    const login = await post('/auth/login', {
      emailOrPhone: registration.email,
      password: registration.password,
    });
    const profile = await fetch('/api/profile', {
      headers: { Authorization: 'Bearer demo-token-2' },
    });
    return {
      created: created.status,
      duplicate: duplicate.status,
      login: await login.text(),
      profile: await profile.text(),
    };
  });
  expect(result.created).toBe(201);
  expect(result.duplicate).toBe(409);
  expect(JSON.parse(result.login)).toEqual({ accessToken: 'demo-token-2' });
  expect(JSON.parse(result.profile)).toMatchObject({ email: 'ada@example.test' });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      async () =>
        (await fetch('/api/profile', { headers: { Authorization: 'Bearer demo-token-2' } })).status,
    ),
  ).toBe(401);
  expect(
    await page.evaluate(
      async () =>
        (await fetch('/api/profile', { headers: { Authorization: 'Bearer demo-token' } })).status,
    ),
  ).toBe(200);
});
