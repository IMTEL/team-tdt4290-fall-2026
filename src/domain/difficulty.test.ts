// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { difficultyLevel, followUpOf, questionCountOf } from './difficulty';

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

describe('questionCountOf', () => {
  it('is the number of questions the wizard wrote', () => {
    expect(questionCountOf('lett | Antall spørsmål: 5–6 | Oppfølgingsspørsmål: ja')).toBe('5–6');
    expect(questionCountOf('lett | Antall spørsmål: 12')).toBe('12');
  });

  it('is empty when the answer has no number of questions', () => {
    expect(questionCountOf('lett')).toBe('');
    expect(questionCountOf(undefined)).toBe('');
  });
});

describe('followUpOf', () => {
  it('reads yes and no', () => {
    expect(followUpOf('lett | Antall spørsmål: 6 | Oppfølgingsspørsmål: ja')).toBe('ja');
    expect(followUpOf('lett | Antall spørsmål: 6 | Oppfølgingsspørsmål: Nei')).toBe('nei');
  });

  it('is null when the answer says neither', () => {
    expect(followUpOf('lett | Antall spørsmål: 6')).toBeNull();
    expect(followUpOf(null)).toBeNull();
  });
});
