import { expect, test } from '@playwright/test';

test('keyboard submit validates, sends once and renders failure then profile without an extra click', async ({
  page,
}) => {
  const logins: string[] = [];
  const errors: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/auth/login') logins.push(request.url());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/auth/login');
  await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByLabel('Email or phone number')).toBeFocused();
  await expect(page.getByText('Enter your password', { exact: true })).toBeVisible();
  expect(logins).toHaveLength(0);
  await page.getByLabel('Email or phone number').fill('demo@example.test');
  await page.getByLabel('Password', { exact: true }).fill('wrong-password');
  await page.getByLabel('Password', { exact: true }).press('Enter');
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeDisabled();
  await expect(page.getByRole('status')).toContainText('Signing in');
  await expect(page.getByRole('alert')).toHaveText('Invalid email, phone number or password.');
  expect(logins).toHaveLength(1);
  await expect(page.getByLabel('Password', { exact: true })).toHaveValue('wrong-password');
  await page.getByLabel('Password', { exact: true }).fill('demo-password');
  await page.getByLabel('Password', { exact: true }).press('Enter');
  await expect(page).toHaveURL('/profile');
  await expect(page.getByText('Demo User', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Profile', exact: true })).toBeFocused();
  expect(logins).toHaveLength(2);
  await page.screenshot({
    path: test.info().outputPath('profile-desktop.png'),
    fullPage: true,
    animations: 'disabled',
  });
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL('/auth/login');
  await expect(page.getByLabel('Email or phone number')).toHaveValue('');
  await expect(page.getByLabel('Password', { exact: true })).toHaveValue('');
  expect(
    await page.evaluate(() => sessionStorage.getItem('angular-ngrx-demo.session-token')),
  ).toBeNull();
  expect(errors).toEqual([]);
});

test('registration validates email and matching passwords, preserves a conflict and completes through MSW', async ({
  page,
}) => {
  const registrations: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/auth/sign-up') registrations.push(request.url());
  });
  await page.goto('/auth/sign-up');
  await page.getByLabel('First name', { exact: true }).fill('Anna');
  await page.getByLabel('Last name', { exact: true }).fill('Ivanova');
  await page.getByLabel('Email', { exact: true }).fill('bad-email');
  await page.getByLabel('Password', { exact: true }).fill('new-password');
  await page.getByLabel('Confirm password').fill('different');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Enter a valid email address', { exact: true })).toBeVisible();
  await expect(page.getByText('Passwords do not match.', { exact: true })).toBeVisible();
  expect(registrations).toHaveLength(0);
  await page.getByLabel('Email', { exact: true }).fill('demo@example.test');
  await page.getByLabel('Confirm password').fill('new-password');
  await page.getByLabel('Confirm password').press('Enter');
  await expect(page.getByRole('status')).toContainText('Creating your account');
  await expect(page.getByRole('alert')).toHaveText('This email is already registered.');
  await expect(page.getByLabel('Password', { exact: true })).toHaveValue('new-password');
  await page.getByLabel('Email', { exact: true }).fill('anna@example.test');
  await page.getByLabel('Confirm password').press('Enter');
  await expect(page).toHaveURL('/auth/login');
  await expect(page.getByRole('status')).toContainText('Registration complete');
  expect(registrations).toHaveLength(2);
});

test('forms fit a narrow viewport and a route change resets the draft and errors', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/auth/login');
  await page.getByLabel('Email or phone number').fill('draft@example.test');
  await page.getByRole('link', { name: 'Sign up' }).click();
  await expect(page.getByRole('heading', { name: 'Sign up', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByLabel('First name', { exact: true })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: test.info().outputPath('sign-up-mobile-errors.png'),
    fullPage: true,
    animations: 'disabled',
  });
  await page.getByRole('link', { name: 'Sign in', exact: true }).click();
  await expect(page.getByLabel('Email or phone number')).toHaveValue('');
  await expect(page.getByText('Enter your password', { exact: true })).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: test.info().outputPath('login-mobile.png'),
    fullPage: true,
    animations: 'disabled',
  });
});

test('the legacy profile URL redirects to the guarded profile view', async ({ page }) => {
  await page.addInitScript(() =>
    sessionStorage.setItem('angular-ngrx-demo.session-token', 'demo-token'),
  );
  await page.goto('/core/my-day');
  await expect(page).toHaveURL('/profile');
  await expect(page.getByText('Demo User', { exact: true })).toBeVisible();
});
