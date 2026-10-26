import { describe, expect, it } from 'vitest';

import { cleanPublicDescription, MAX_PUBLIC_DESCRIPTION_LENGTH } from './publication';

describe('cleanPublicDescription', () => {
  it('trims the description', () => {
    expect(cleanPublicDescription('  Øv på et første intervju  ')).toBe('Øv på et første intervju');
  });

  it('allows an empty or missing description', () => {
    expect(cleanPublicDescription('')).toBe('');
    expect(cleanPublicDescription(undefined)).toBe('');
  });

  it('rejects a description that is too long or not text', () => {
    expect(cleanPublicDescription('x'.repeat(MAX_PUBLIC_DESCRIPTION_LENGTH + 1))).toBeNull();
    expect(cleanPublicDescription(42)).toBeNull();
    expect(cleanPublicDescription(null)).toBeNull();
  });
});
