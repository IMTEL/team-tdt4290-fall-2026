import { getAgentType, hasAllAnswers } from './registry';

// @vitest-environment node
import { describe, expect, it } from 'vitest';

const interviewer = getAgentType('interviewer')!;

const answers = {
  stilling: 'Butikkmedarbeider',
  bransje: 'Varehandel (privat)',
  bedrift: 'Nærbutikken AS',
  intervjutype: 'første intervju',
  intervjuer: 'butikksjef, vennlig',
  jobbsoker: 'under 25, lite erfaring',
  vanskelighetsgrad: 'lett',
  egneSporsmal: 'ingen',
};

describe('getAgentType', () => {
  it('knows the interviewer', () => {
    expect(interviewer.id).toBe('interviewer');
    expect(interviewer.fields.map((f) => f.label)).toContain('Stilling');
  });

  it('returns undefined for an unknown type', () => {
    expect(getAgentType('nope')).toBeUndefined();
  });
});

describe('hasAllAnswers', () => {
  it('accepts a full set of answers', () => {
    expect(hasAllAnswers(interviewer, answers)).toBe(true);
  });

  it('rejects a missing or blank answer', () => {
    expect(hasAllAnswers(interviewer, { ...answers, bransje: '  ' })).toBe(false);
    expect(hasAllAnswers(interviewer, { ...answers, stilling: undefined })).toBe(false);
  });

  it('rejects things that are not objects', () => {
    expect(hasAllAnswers(interviewer, null)).toBe(false);
    expect(hasAllAnswers(interviewer, 'tekst')).toBe(false);
  });
});

describe('the interviewer type', () => {
  it('puts the answers into the prompt and the role', () => {
    expect(interviewer.buildPrompt(answers)).toContain('Stilling: Butikkmedarbeider');
    expect(interviewer.buildRoles('Ola', answers)).toEqual([
      { name: 'Ola', description: 'butikksjef, vennlig' },
    ]);
  });
});
