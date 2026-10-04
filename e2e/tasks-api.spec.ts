import { expect, test } from '@playwright/test';

test('real worker isolates tasks by account and confirms completion changes', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
  const result = await page.evaluate(async () => {
    const post = (path: string, body: unknown) =>
      fetch(`/api${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    const list = (token: string) =>
      fetch('/api/tasks', { headers: { Authorization: `Bearer ${token}` } });
    const patch = (token: string) =>
      fetch('/api/tasks/1', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: true, userId: 1 }),
      });
    const login = await post('/auth/login', {
      emailOrPhone: 'demo@example.test',
      password: 'demo-password',
    });
    const before = await list('demo-token');
    const saved = await patch('demo-token');
    const after = await list('demo-token');
    const registration = {
      firstName: 'New',
      lastName: 'User',
      email: 'tasks@example.test',
      password: 'secret',
      confirmPassword: 'secret',
    };
    const created = await post('/auth/sign-up', registration);
    const newLogin = await post('/auth/login', {
      emailOrPhone: registration.email,
      password: registration.password,
    });
    const empty = await list('demo-token-2');
    const forbidden = await patch('demo-token-2');
    const own = await list('demo-token');
    return {
      login: await login.text(),
      before: await before.text(),
      saved: await saved.text(),
      after: await after.text(),
      created: created.status,
      newLogin: await newLogin.text(),
      empty: await empty.text(),
      forbidden: forbidden.status,
      own: await own.text(),
      unauthorized: (await list('invalid')).status,
    };
  });
  const seed = [
    { id: 1, title: 'Review the feature structure', completed: false },
    { id: 2, title: 'Explore NgRx selectors', completed: false },
    { id: 3, title: 'Try updating a task', completed: true },
  ];
  const saved = { id: 1, title: 'Review the feature structure', completed: true };
  expect(JSON.parse(result.login)).toEqual({ accessToken: 'demo-token' });
  expect(JSON.parse(result.before)).toEqual(seed);
  expect(JSON.parse(result.saved)).toEqual(saved);
  expect(JSON.parse(result.after)).toEqual([saved, seed[1], seed[2]]);
  expect(result.created).toBe(201);
  expect(JSON.parse(result.newLogin)).toEqual({ accessToken: 'demo-token-2' });
  expect(JSON.parse(result.empty)).toEqual([]);
  expect(result.forbidden).toBe(404);
  expect(JSON.parse(result.own)).toEqual([saved, seed[1], seed[2]]);
  expect(result.unauthorized).toBe(401);
  expect(errors).toEqual([]);
});
