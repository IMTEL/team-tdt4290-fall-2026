import { describe, expect, it } from 'vitest';

import { cleanName, cloneName, MAX_NAME_LENGTH } from './agentName';

describe('cloneName', () => {
  it('adds "(kopi)" to the name', () => {
    expect(cloneName('Intervjuer IT')).toBe('Intervjuer IT (kopi)');
  });

  it('shortens a long name so the copy is still a valid name', () => {
    const name = cloneName('a'.repeat(MAX_NAME_LENGTH));

    expect(name).toHaveLength(MAX_NAME_LENGTH);
    expect(name.endsWith(' (kopi)')).toBe(true);
    expect(cleanName(name)).toBe(name);
  });
});
