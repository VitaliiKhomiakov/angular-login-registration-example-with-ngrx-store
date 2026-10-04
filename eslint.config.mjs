import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import angular from 'angular-eslint';
import prettier from 'eslint-config-prettier/flat';

// Features consume Store; only application composition initializes it.
const rootStoreBoundary = {
  regex: '(^|/)(root-store\\.providers|app\\.config)(?:\\.[cm]?ts)?$',
  message: 'Feature and infrastructure code must not import application root wiring.',
};

const protectedAreaBoundary = {
  regex: '^(?!@angular/)(?:.*/)?(?:core|profile|tasks)/',
  message: 'Auth must not depend on protected features or their composition.',
};
const coreCompositionBoundary = {
  regex: '(^|/)(?:core\\.routes(?:\\.[cm]?ts)?$|layout/)',
  message: 'Core pages and nested domains must not import parent route/layout composition.',
};
const authUiBoundary = {
  regex: '(^|/)auth/(?:pages|components|layout)/',
  message: 'Other sections may consume public auth contracts, not auth UI.',
};
const dataAccessBoundary = {
  regex:
    '^@ngrx/|(^|/)(store|pages|components|tasks-page|task-item|shell|layout|profile|login|sign-up)/',
  message: 'Data-access adapters must not depend on Store or UI.',
};
const uiBoundary = {
  regex: '(^|/)(pages|components|layout)/',
  message: 'Store must not depend on pages, presentation components or layouts.',
};

export default defineConfig(
  { ignores: ['dist/**', '.angular/**', 'coverage/**', 'playwright-report/**', '.cache/**'] },
  {
    files: ['src/**/*.ts', 'e2e/**/*.ts', 'playwright.config.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      angular.configs.tsRecommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.app.json', './tsconfig.spec.json', './tsconfig.e2e.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    processor: angular.processInlineTemplates,
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
    },
  },
  {
    files: ['src/app/features/**/*.ts'],
    ignores: ['**/*.spec.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [rootStoreBoundary] }],
    },
  },
  {
    files: ['src/app/features/**/*.ts'],
    ignores: ['**/*.spec.ts', 'src/app/features/auth/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [rootStoreBoundary, authUiBoundary] }],
    },
  },
  {
    files: ['src/app/features/core/pages/**/*.ts', 'src/app/features/core/tasks/**/*.ts'],
    ignores: ['**/*.spec.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [rootStoreBoundary, coreCompositionBoundary, authUiBoundary],
        },
      ],
    },
  },
  {
    files: ['src/app/store/**/*.ts'],
    ignores: ['**/*.spec.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex:
                '^(?!@angular/)(?:.*/)?(?:core|profile|tasks)/|(^|/)(pages|components|login-page|sign-up-page)/',
              message: 'Root Store composition must not import protected features or auth UI.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/app/config/**/*.ts', 'src/app/http/**/*.ts', 'src/app/session/**/*.ts'],
    ignores: ['**/*.spec.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            rootStoreBoundary,
            {
              regex: '^(?!@angular/)(?:.*/)?(?:features|auth|core)/|^@ngrx/',
              message: 'Root infrastructure must not depend on feature UI or Store.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/app/features/auth/**/*.ts'],
    ignores: ['**/*.spec.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [rootStoreBoundary, protectedAreaBoundary],
        },
      ],
    },
  },
  {
    files: [
      'src/app/features/auth/data-access/**/*.ts',
      'src/app/features/core/tasks/data-access/**/*.ts',
    ],
    ignores: ['**/*.spec.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [rootStoreBoundary, coreCompositionBoundary, dataAccessBoundary],
        },
      ],
    },
  },
  {
    files: ['src/app/features/auth/data-access/**/*.ts'],
    ignores: ['**/*.spec.ts'],
    rules: {
      // The complete list is intentional: later flat-config rules replace it.
      'no-restricted-imports': [
        'error',
        {
          patterns: [rootStoreBoundary, protectedAreaBoundary, dataAccessBoundary],
        },
      ],
    },
  },
  {
    files: ['src/app/features/auth/store/**/*.ts'],
    ignores: ['**/*.spec.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [rootStoreBoundary, protectedAreaBoundary, uiBoundary],
        },
      ],
    },
  },
  {
    files: ['src/testing/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '(^|/)app/|^@ngrx/',
              message: 'Shared test helpers must not depend on application features or Store.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/app/features/core/tasks/components/**/*.ts'],
    ignores: ['**/*.spec.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            rootStoreBoundary,
            coreCompositionBoundary,
            {
              regex:
                '^@ngrx/|^@angular/common/http(?:/|$)|(^|/)(store|auth|config|http|session|pages|layout)/|(^|/)(?:api|data-access)/tasks-api$',
              message:
                'Task components own presentation and typed intent, without pages/layout/Store/HTTP/API/auth.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/app/features/core/tasks/store/**/*.ts'],
    ignores: ['**/*.spec.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            rootStoreBoundary,
            coreCompositionBoundary,
            {
              regex:
                '(^|/)(pages|components|tasks-page|task-item|shell|layout)/|(^|/)auth/(?!store/auth-actions$)',
              message:
                'Task Store may use its API contracts and public auth events, not UI or auth-private state.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
  },
  prettier,
);
