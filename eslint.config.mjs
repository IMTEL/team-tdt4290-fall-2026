// ESLint flat config for Next.js 16.
// Prettier handles formatting, so eslint-config-prettier switches off every
// formatting rule here — never fight the formatter in lint.
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier/flat';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Unused variables are an error, except arguments deliberately named _something.
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // Leftover console.log should not reach main; warn instead of blocking work in progress.
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // Command-line scripts report to the terminal on purpose.
    files: ['scripts/**'],
    rules: { 'no-console': 'off' },
  },
  prettier,
  globalIgnores([
    'node_modules/**',
    '.next/**',
    'out/**',
    'build/**',
    'dist/**',
    'coverage/**',
    'next-env.d.ts',
  ]),
]);

export default eslintConfig;
