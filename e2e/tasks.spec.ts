import { expect, test, type Page } from '@playwright/test';

async function signIn(
  page: Page,
  email = 'demo@example.test',
  password = 'demo-password',
): Promise<void> {
  await page.getByLabel('Email or phone number').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Password', { exact: true }).press('Enter');
  await expect(page).toHaveURL('/profile');
  await expect(page.getByRole('heading', { name: 'Profile', exact: true })).toBeVisible();
}

test('tasks filters and confirmed completion survive profile navigation with one request per entry', async ({
  page,
}) => {
  const reads: string[] = [];
  const errors: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/tasks' && request.method() === 'GET')
      reads.push(request.url());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/auth/login');
  await signIn(page);
  await page.getByRole('link', { name: 'My tasks', exact: true }).click();
  await expect(page).toHaveURL('/tasks');
  await expect(page.getByRole('heading', { name: 'My tasks', exact: true })).toBeFocused();
  await expect(page.getByTestId('task-counts')).toHaveText('2 remaining of 3');
  await expect(page.getByRole('listitem')).toHaveCount(3);
  await expect(page.getByRole('link', { name: 'My tasks', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(page.getByTestId('logout')).toHaveCount(1);
  await page.getByRole('button', { name: 'Active', exact: true }).click();
  await expect(page.getByRole('listitem')).toHaveCount(2);
  await page.getByRole('button', { name: 'Completed', exact: true }).click();
  await expect(page.getByRole('listitem')).toHaveCount(1);
  await expect(page.getByRole('listitem')).toContainText('Try updating a task');
  await page.getByRole('button', { name: 'All', exact: true }).click();
  await page
    .getByRole('button', { name: 'Mark complete: Review the feature structure', exact: true })
    .click();
  await expect(page.getByTestId('task-counts')).toHaveText('1 remaining of 3');
  await expect(
    page.getByRole('button', { name: 'Mark active: Review the feature structure', exact: true }),
  ).toBeEnabled();
  await page.getByRole('button', { name: 'Completed', exact: true }).click();
  await expect(page.getByRole('listitem')).toHaveCount(2);
  await page.getByRole('link', { name: 'Profile', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Profile', exact: true })).toBeFocused();
  await expect(page.getByText('Demo User', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'My tasks', exact: true }).click();
  await expect(page.getByTestId('task-counts')).toHaveText('1 remaining of 3');
  await expect(page.getByRole('listitem')).toHaveCount(3);
  await expect(page.getByRole('button', { name: 'All', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(reads).toHaveLength(2);
  expect(errors).toEqual([]);
  await page.screenshot({
    path: test.info().outputPath('desktop.png'),
    fullPage: true,
    animations: 'disabled',
  });
});

test('logout/new account clears task rows while same-page demo sign-in reloads its own records', async ({
  page,
}) => {
  await page.goto('/auth/login');
  await signIn(page);
  await page.getByRole('link', { name: 'My tasks', exact: true }).click();
  await expect(page.getByTestId('task-counts')).toHaveText('2 remaining of 3');
  await page
    .getByRole('button', { name: 'Mark complete: Review the feature structure', exact: true })
    .click();
  await expect(page.getByTestId('task-counts')).toHaveText('1 remaining of 3');
  await page.getByTestId('logout').click();
  await expect(page).toHaveURL('/auth/login');
  await expect(page.getByRole('navigation', { name: 'Account navigation' })).toHaveCount(0);
  await expect(page.getByText('Review the feature structure', { exact: true })).toHaveCount(0);
  expect(
    await page.evaluate(() => sessionStorage.getItem('angular-ngrx-demo.session-token')),
  ).toBeNull();
  await page.getByRole('link', { name: 'Sign up', exact: true }).click();
  await page.getByLabel('First name', { exact: true }).fill('New');
  await page.getByLabel('Last name', { exact: true }).fill('User');
  await page.getByLabel('Email', { exact: true }).fill('tasks-user@example.test');
  await page.getByLabel('Password', { exact: true }).fill('new-password');
  await page.getByLabel('Confirm password').fill('new-password');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page).toHaveURL('/auth/login');
  await signIn(page, 'tasks-user@example.test', 'new-password');
  await page.getByRole('link', { name: 'My tasks', exact: true }).click();
  await expect(page.getByTestId('task-counts')).toHaveText('0 remaining of 0');
  await expect(page.getByText('No tasks yet.', { exact: true })).toBeVisible();
  await expect(page.getByRole('listitem')).toHaveCount(0);
  await page.getByTestId('logout').click();
  await expect(page).toHaveURL('/auth/login');
  await signIn(page);
  await page.getByRole('link', { name: 'My tasks', exact: true }).click();
  await expect(page.getByTestId('task-counts')).toHaveText('1 remaining of 3');
  await expect(page.getByRole('listitem')).toHaveCount(3);
});

test('direct anonymous tasks access renders public forms without task HTTP or private navigation', async ({
  page,
}) => {
  const reads: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/tasks')) reads.push(request.url());
  });
  await page.goto('/tasks');
  await expect(page).toHaveURL('/auth/login');
  await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Account navigation' })).toHaveCount(0);
  await expect(page.getByTestId('logout')).toHaveCount(0);
  expect(reads).toEqual([]);
  await page.getByRole('link', { name: 'Sign up', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sign up', exact: true })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Account navigation' })).toHaveCount(0);
});

test('task navigation/filter/save works with the keyboard and fits a 320px viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/auth/login');
  await signIn(page);
  const tasksLink = page.getByRole('link', { name: 'My tasks', exact: true });
  await tasksLink.focus();
  await tasksLink.press('Enter');
  await expect(page.getByRole('heading', { name: 'My tasks', exact: true })).toBeFocused();
  await expect(page.getByTestId('task-counts')).toHaveText('2 remaining of 3');
  const active = page.getByRole('button', { name: 'Active', exact: true });
  await active.focus();
  await active.press('Enter');
  await expect(active).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('listitem')).toHaveCount(2);
  const all = page.getByRole('button', { name: 'All', exact: true });
  await all.focus();
  await all.press('Enter');
  const complete = page.getByRole('button', {
    name: 'Mark complete: Review the feature structure',
    exact: true,
  });
  await complete.focus();
  await complete.press('Enter');
  await expect(page.getByTestId('task-counts')).toHaveText('1 remaining of 3');
  await expect(
    page.getByRole('button', { name: 'Mark active: Review the feature structure', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page.getByTestId('task-counts')).toHaveText('2 remaining of 3');
  await expect(
    page.getByRole('button', { name: 'Mark complete: Review the feature structure', exact: true }),
  ).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: test.info().outputPath('mobile.png'),
    fullPage: true,
    animations: 'disabled',
  });
});
