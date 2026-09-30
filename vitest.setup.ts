// Runs before every test file. Importing jest-dom here registers its matchers
// (toBeInTheDocument, toBeDisabled, ...) with Vitest and, because this file is
// part of the TypeScript project, also makes their types visible to tsc.
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Testing Library only cleans up automatically when test globals are enabled; we
// import from 'vitest' explicitly instead, so unmount rendered trees ourselves.
afterEach(() => {
  cleanup();
});
