// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { difficultyLevel } from './difficulty';

describe('difficultyLevel', () => {
  it('is the level alone, capitalised', () => {
    expect(difficultyLevel('lett')).toBe('Lett');
  });

  it('leaves out what the chat added after the level', () => {
    expect(difficultyLevel('middels | Antall spørsmål: 6 | Oppfølgingsspørsmål: ja')).toBe(
      'Middels',
    );
  });

  it('is empty when there is no answer', () => {
    expect(difficultyLevel('')).toBe('');
    expect(difficultyLevel(null)).toBe('');
    expect(difficultyLevel(undefined)).toBe('');
  });
});
