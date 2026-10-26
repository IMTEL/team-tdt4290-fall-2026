import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Mirrors the `@/*` path alias in tsconfig.json.
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    // MUI forms in jsdom are slow when many test files run at once, so the default 5 s made
    // tests time out on busy machines. A test that really hangs still fails, just later.
    testTimeout: 15000,
    // Newer Node versions have their own localStorage, which hides jsdom's and is undefined
    // without a file to store it in. Turning it off lets the tests use jsdom's.
    execArgv: ['--no-experimental-webstorage'],
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: [...configDefaults.exclude, '.next/**'],
  },
});
