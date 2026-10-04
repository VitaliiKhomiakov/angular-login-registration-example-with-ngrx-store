import { expect, test, type Page } from '@playwright/test';
import type { ProfileOutcome } from './auth-browser-contracts';

async function ready(page: Page): Promise<void> {
  await expect.poll(() => page.evaluate(() => Boolean(window.authAcceptance))).toBe(true);
}

async function login(page: Page): Promise<void> {
  await page.getByLabel('Email or phone number').fill('demo@example.test');
  await page.getByLabel('Password', { exact: true }).fill('demo-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}

async function gate(page: Page, outcome: ProfileOutcome): Promise<void> {
  await page.evaluate((response) => window.authAcceptance.gateNextProfile(response), outcome);
}

test('A2/A5/A7: pending login/profile admits one request, then reload and logout use the same session lifecycle', async ({
  page,
}) => {
  const logins: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/auth/login') logins.push(request.url());
  });
  await page.goto('/auth/login');
  await ready(page);
  await gate(page, 'success');
  await login(page);
  await page.evaluate(() => window.authAcceptance.waitForProfile());
  await expect(page.getByRole('status')).toContainText('Signing in');
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeDisabled();
  // Native form events bypass the disabled button, so the handler itself must guard.
  await page.locator('form').evaluate((form) => {
    if (!(form instanceof HTMLFormElement)) throw new Error('Expected a form');
    form.requestSubmit();
    form.requestSubmit();
  });
  expect(logins).toHaveLength(1);
  await page.evaluate(() => window.authAcceptance.releaseProfile());
  await expect(page).toHaveURL('/profile');
  await expect(page.getByText('Demo User', { exact: true })).toBeVisible();
  await expect(page.getByRole('status')).toHaveCount(0);
  expect((await page.evaluate(() => window.authAcceptance.snapshot())).sessionStatus).toBe(
    'authenticated',
  );
  await page.reload();
  await expect(page.getByText('Demo User', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL('/auth/login');
  expect(
    await page.evaluate(() => sessionStorage.getItem('angular-ngrx-demo.session-token')),
  ).toBeNull();
  await page.evaluate(() => window.authAcceptance.navigate('/profile'));
  await expect(page).toHaveURL('/auth/login');
});

test('registration through the UI allows phone login, and reload expires the page-local account', async ({
  page,
}) => {
  await page.goto('/auth/sign-up');
  await ready(page);
  await page.getByLabel('First name', { exact: true }).fill('Ada');
  await page.getByLabel('Last name', { exact: true }).fill('Lovelace');
  await page.getByLabel('Email', { exact: true }).fill('ada@example.test');
  await page.getByLabel('Phone number (optional)').fill('+380123456789');
  await page.getByLabel('Password', { exact: true }).fill('new-password');
  await page.getByLabel('Confirm password').fill('new-password');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL('/auth/login');
  await expect(page.getByRole('status')).toContainText('Registration complete');
  await page.getByLabel('Email or phone number').fill('+380123456789');
  await page.getByLabel('Password', { exact: true }).fill('new-password');
  await page.getByLabel('Password', { exact: true }).press('Enter');
  await expect(page).toHaveURL('/profile');
  await expect(page.getByText('Ada Lovelace', { exact: true })).toBeVisible();
  await expect(page.getByText('+380123456789', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page).toHaveURL('/auth/login');
  expect(
    await page.evaluate(() => sessionStorage.getItem('angular-ngrx-demo.session-token')),
  ).toBeNull();
});

for (const outcome of ['unavailable', 'malformed'] as const) {
  test(`A3/A7/A11: ${outcome} profile ends loading safely and a later login succeeds`, async ({
    page,
  }) => {
    await page.goto('/auth/login');
    await ready(page);
    await gate(page, outcome);
    await login(page);
    await page.evaluate(() => window.authAcceptance.waitForProfile());
    await page.evaluate(() => window.authAcceptance.releaseProfile());
    await expect(page.getByRole('alert')).toHaveText(
      outcome === 'malformed'
        ? 'The server returned an invalid response. Please try again.'
        : 'Unable to load your profile. Please sign in again.',
    );
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeEnabled();
    await expect(page.getByLabel('Password', { exact: true })).toHaveValue('demo-password');
    const state = await page.evaluate(() => window.authAcceptance.snapshot());
    expect(state.sessionStatus).toBe('error');
    expect(state.user).toBeNull();
    expect(
      await page.evaluate(() => sessionStorage.getItem('angular-ngrx-demo.session-token')),
    ).toBeNull();
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.getByText('Demo User', { exact: true })).toBeVisible();
  });
}

test('A6: temporary restoration failure settles the guard and retry retains the saved token', async ({
  page,
}) => {
  await page.addInitScript(() =>
    sessionStorage.setItem('angular-ngrx-demo.session-token', 'demo-token'),
  );
  await page.goto('/profile?acceptanceProfile=unavailable');
  await ready(page);
  await page.evaluate(() => window.authAcceptance.waitForProfile());
  await page.evaluate(() => window.authAcceptance.releaseProfile());
  await expect(page).toHaveURL('/auth/login');
  await expect(page.getByRole('alert')).toHaveText(
    'Unable to restore your session. Please try again.',
  );
  expect(await page.evaluate(() => sessionStorage.getItem('angular-ngrx-demo.session-token'))).toBe(
    'demo-token',
  );
  await page.getByRole('button', { name: 'Retry session restoration' }).click();
  await expect(page).toHaveURL('/profile');
  await expect(page.getByText('Demo User', { exact: true })).toBeVisible();
});

test('A6: a gated profile released after logout cannot restore the old session or prevent a new login', async ({
  page,
}) => {
  await page.goto('/auth/login');
  await ready(page);
  await gate(page, 'success');
  await login(page);
  await page.evaluate(() => window.authAcceptance.waitForProfile());
  expect((await page.evaluate(() => window.authAcceptance.snapshot())).sessionStatus).toBe(
    'loading',
  );
  const abortedProfile = page.waitForEvent('requestfailed', {
    predicate: (request) => new URL(request.url()).pathname === '/api/profile',
  });
  await page.evaluate(() => window.authAcceptance.logout());
  expect((await abortedProfile).failure()?.errorText).toContain('ERR_ABORTED');
  await expect(page.getByRole('status')).toHaveCount(0);
  await page.evaluate(() => window.authAcceptance.releaseProfile());
  expect((await page.evaluate(() => window.authAcceptance.snapshot())).sessionStatus).toBe(
    'anonymous',
  );
  expect((await page.evaluate(() => window.authAcceptance.snapshot())).user).toBeNull();
  expect(
    await page.evaluate(() => sessionStorage.getItem('angular-ngrx-demo.session-token')),
  ).toBeNull();
  await page.evaluate(() => window.authAcceptance.navigate('/profile'));
  await expect(page).toHaveURL('/auth/login');
  await login(page);
  await expect(page.getByText('Demo User', { exact: true })).toBeVisible();
});

test('A8: real HttpClient/interceptor leaves external URLs and assets unprefixed and without tokens', async ({
  page,
}) => {
  await page.goto('/auth/login');
  await ready(page);
  const anonymousProfile = page.waitForRequest(
    (request) => new URL(request.url()).pathname === '/api/profile',
  );
  await page.evaluate(() => window.authAcceptance.getText('/api/profile'));
  expect((await (await anonymousProfile).allHeaders())['authorization']).toBeUndefined();
  await login(page);
  await expect(page.getByText('Demo User', { exact: true })).toBeVisible();
  for (const url of ['/mockServiceWorker.js', 'http://localhost:4200/mockServiceWorker.js']) {
    const expected = new URL(url, page.url()).href;
    const requested = page.waitForRequest((request) => request.url() === expected);
    expect(await page.evaluate((target) => window.authAcceptance.getText(target), url)).toBe('ok');
    expect((await (await requested).allHeaders())['authorization']).toBeUndefined();
  }
});
