// @ts-check
/**
 * Flat ESLint config for the Angular 22 app, Vitest specs, and Bun scripts.
 * Prettier is a separate format step.
 */

import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import angular from 'angular-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

const typeScriptRules = {
  '@typescript-eslint/explicit-function-return-type': [
    'error',
    {
      allowExpressions: true,
      allowTypedFunctionExpressions: true,
    },
  ],
  '@typescript-eslint/no-explicit-any': 'error',
  '@typescript-eslint/no-unused-vars': [
    'error',
    {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
    },
  ],
  '@typescript-eslint/consistent-type-imports': [
    'error',
    {
      prefer: 'type-imports',
      fixStyle: 'separate-type-imports',
    },
  ],
};

export default defineConfig([
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      '.angular/**',
      'coverage/**',
      'public/**',
      '**/*.tsbuildinfo',
      'src/app/core/images/image-manifest.generated.ts',
    ],
  },
  {
    files: ['src/**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      ...typeScriptRules,
      // The v22 style guide drops Component and Directive suffixes.
      '@angular-eslint/component-class-suffix': 'off',
      '@angular-eslint/directive-class-suffix': 'off',
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'app',
          style: 'kebab-case',
        },
      ],
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/no-empty-lifecycle-method': 'error',
      // OnPush is the Angular 22 default, so components do not set it.
      '@angular-eslint/prefer-on-push-component-change-detection': 'off',
      '@angular-eslint/use-lifecycle-interface': 'error',
      'no-console': ['warn', { allow: ['warn', 'error', 'debug'] }],
      'no-debugger': 'error',
      eqeqeq: ['error', 'always'],
    },
  },
  {
    files: ['src/**/*.html'],
    extends: [
      angular.configs.templateRecommended,
      angular.configs.templateAccessibility,
    ],
    rules: {
      '@angular-eslint/template/prefer-control-flow': 'error',
      '@angular-eslint/template/banana-in-box': 'error',
      '@angular-eslint/template/eqeqeq': 'error',
      '@angular-eslint/template/no-negated-async': 'error',
      '@angular-eslint/template/click-events-have-key-events': 'warn',
      '@angular-eslint/template/mouse-events-have-key-events': 'warn',
      '@angular-eslint/template/no-autofocus': 'warn',
    },
  },
  {
    files: ['workers/**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
    ],
    languageOptions: {
      globals: {
        ...globals.serviceworker,
      },
    },
    rules: {
      ...typeScriptRules,
      'no-undef': 'off',
      'no-console': 'error',
      eqeqeq: ['error', 'always'],
    },
  },
  {
    files: ['scripts/**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
    ],
    languageOptions: {
      globals: {
        ...globals.node,
        Bun: 'readonly',
      },
    },
    rules: {
      ...typeScriptRules,
      'no-console': 'off',
      eqeqeq: ['error', 'always'],
    },
  },
  prettier,
  {
    files: ['**/*.ts'],
    rules: {
      // Prettier turns this off. `all` does not fight Prettier, and Google's
      // TypeScript style requires braces on every control statement.
      curly: ['error', 'all'],
    },
  },
]);
