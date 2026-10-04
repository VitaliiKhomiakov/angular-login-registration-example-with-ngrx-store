import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { ESLint, Linter } from 'eslint';

// Check the merged rule for real source paths: flat-config overrides can silently
// discard a broader area's restrictions. No invalid imports enter application code.
const cases = [
  ['src/app/features/core/layout/core-layout.ts', '../../auth/pages/login-page/login-page', true],
  [
    'src/app/features/core/pages/profile-page/profile-page.ts',
    '../../../auth/pages/login-page/login-page',
    true,
  ],
  ['src/app/features/core/tasks/pages/tasks-page/tasks-page.ts', '../../../core.routes', true],
  ['src/app/features/core/tasks/store/tasks-effects.ts', '../data-access/tasks-api', false],
  ['src/app/features/core/core.routes.ts', './pages/profile-page/profile-page', false],
  ['src/app/features/core/core.routes.ts', '../../app.config', true],
  [
    'src/app/features/auth/store/auth-effects.ts',
    '../../core/pages/profile-page/profile-page',
    true,
  ],
  ['src/app/features/auth/store/auth-effects.ts', '../../core/core.routes', true],
  ['src/app/features/core/tasks/store/tasks-effects.ts', '../../core.routes', true],
  ['src/app/features/core/tasks/data-access/tasks-api.ts', '../../core.routes', true],
  ['src/app/features/core/pages/profile-page/profile-page.ts', '../../core.routes', true],
  [
    'src/app/features/core/pages/profile-page/profile-page.ts',
    '../../../auth/store/auth-selectors',
    false,
  ],
  ['src/app/features/core/pages/profile-page/profile-page.ts', '../../../../app.config', true],
  ['src/app/store/root-store.providers.ts', '../features/core/tasks/store/tasks-feature', true],
  [
    'src/app/store/root-store.providers.ts',
    '../features/core/pages/profile-page/profile-page',
    true,
  ],
  ['src/app/http/api-interceptor.ts', '../features/core/tasks/data-access/tasks-api', true],
  ['src/app/features/core/core.routes.ts', './tasks/tasks.routes', false],
  ['src/app/features/core/layout/core-layout.ts', '../../auth/store/auth-actions', false],
  ['src/app/features/auth/store/auth-effects.ts', '../pages/login-page/login-page', true],
  ['src/app/features/auth/store/auth-effects.ts', '../data-access/auth-api', false],
  ['src/app/features/auth/store/auth-effects.ts', '../../core/tasks/store/tasks-actions', true],
  ['src/app/features/auth/store/auth-effects.ts', '../../../app.config', true],
  ['src/app/features/auth/data-access/auth-api.ts', '../../core/tasks/data-access/tasks-api', true],
  ['src/app/features/auth/data-access/auth-api.ts', '../store/auth-actions', true],
  ['src/app/features/auth/data-access/auth-api.ts', '../pages/login-page/login-page', true],
  ['src/app/features/auth/data-access/auth-api.ts', '@angular/common/http', false],
  ['src/app/features/auth/data-access/auth-api.ts', './auth-contracts', false],
  ['src/app/features/auth/data-access/auth-api.ts', '../../../http/api-request-context', false],
  [
    'src/app/features/core/tasks/data-access/tasks-api.ts',
    '../../../../http/api-request-context',
    false,
  ],
  ['src/app/http/api-request-context.ts', '../features/auth/store/auth-actions', true],
  [
    'src/app/features/core/tasks/components/task-item/task-item.ts',
    '../../pages/tasks-page/tasks-page',
    true,
  ],
  [
    'src/app/features/core/tasks/components/task-item/task-item.ts',
    '../../../layout/core-layout',
    true,
  ],
  ['src/app/features/core/tasks/components/task-item/task-item.ts', '@ngrx/store', true],
  ['src/app/features/core/tasks/components/task-item/task-item.ts', '@angular/common/http', true],
  [
    'src/app/features/core/tasks/components/task-item/task-item.ts',
    '../../data-access/tasks-api',
    true,
  ],
  [
    'src/app/features/core/tasks/components/task-item/task-item.ts',
    '../../data-access/task-contracts',
    false,
  ],
  ['src/app/features/core/tasks/components/task-item/task-item.ts', '@angular/core', false],
  ['src/app/features/core/tasks/pages/tasks-page/tasks-page.ts', '@ngrx/store', false],
  [
    'src/app/features/core/tasks/pages/tasks-page/tasks-page.ts',
    '../../components/task-item/task-item',
    false,
  ],
  ['src/app/features/core/tasks/store/tasks-effects.ts', '../pages/tasks-page/tasks-page', true],
  ['src/app/features/core/tasks/store/tasks-effects.ts', '../../../auth/store/auth-actions', false],
  [
    'src/app/features/core/tasks/store/tasks-effects.ts',
    '../../../auth/store/auth-selectors',
    true,
  ],
  [
    'src/app/features/core/tasks/data-access/tasks-api.ts',
    '../components/task-item/task-item',
    true,
  ],
  ['src/app/features/core/tasks/data-access/tasks-api.ts', '@angular/core', false],
  ['src/app/features/auth/pages/login-page/login-page.ts', '../../../../app.config', true],
  ['src/app/features/auth/pages/login-page/login-page.spec.ts', '../../../../app.config', false],
  ['src/app/store/root-store.providers.ts', '../features/auth/pages/login-page/login-page', true],
  ['src/app/store/root-store.providers.ts', '../features/auth/store/auth-feature', false],
  ['src/app/http/api-interceptor.ts', '../features/auth/store/auth-actions', true],
  ['src/testing/ui-test-helpers.ts', '../app/features/auth/store/auth-state', true],
  ['src/testing/ui-test-helpers.ts', '@angular/core/testing', false],
];

const eslint = new ESLint();
const linter = new Linter();
const failures = [];

for (const [file, specifier, blocked] of cases) {
  await access(file);
  if (specifier.startsWith('.')) {
    await access(resolve(dirname(file), `${specifier}.ts`));
  }
  const config = await eslint.calculateConfigForFile(file);
  assert.ok(config, `No ESLint configuration for ${file}`);
  const messages = linter.verify(`import { Example } from '${specifier}';`, [
    { rules: { 'no-restricted-imports': config.rules['no-restricted-imports'] ?? 'off' } },
  ]);
  assert.ok(
    messages.every((message) => !message.fatal),
    `Invalid probe: ${file}`,
  );
  const actual = messages.some((message) => message.ruleId === 'no-restricted-imports');
  if (actual !== blocked) {
    failures.push(`${file} -> ${specifier}: expected ${blocked ? 'blocked' : 'allowed'}`);
  }
}

assert.deepEqual(failures, [], failures.join('\n'));
console.log(`Architecture boundaries: ${cases.length} checks passed.`);
