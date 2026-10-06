// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { getAgentType } from './registry';
import { readStoredAnswers, toStoredDescription } from './storedAnswers';

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

describe('toStoredDescription and readStoredAnswers', () => {
  it('reads back what was saved', () => {
    const description = toStoredDescription(interviewer, answers);
    expect(JSON.parse(description)).toMatchObject({ type: 'interviewer', version: 1 });
    expect(readStoredAnswers(description)).toEqual({ definition: interviewer, answers });
  });
});

describe('readStoredAnswers', () => {
  it('reads an agent saved before agent types existed as an interviewer', () => {
    const oldDescription = JSON.stringify(answers);
    expect(readStoredAnswers(oldDescription)).toEqual({ definition: interviewer, answers });
  });

  it('returns null for an unknown agent type', () => {
    const description = JSON.stringify({ type: 'robot', version: 1, answers });
    expect(readStoredAnswers(description)).toBeNull();
  });

  it('returns null when an answer is missing', () => {
    const { bedrift: _, ...incomplete } = answers;
    expect(readStoredAnswers(toStoredDescription(interviewer, incomplete))).toBeNull();
  });

  it('returns null for a description that is not our JSON', () => {
    expect(readStoredAnswers('En vanlig beskrivelse')).toBeNull();
    expect(readStoredAnswers('"bare tekst"')).toBeNull();
  });
});
