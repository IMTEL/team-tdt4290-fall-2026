// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { getAgentType } from './registry';
import { cleanSources, readStoredAnswers, toStoredDescription } from './storedAnswers';
import type { Answers } from './types';

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
    expect(readStoredAnswers(description)).toEqual({
      definition: interviewer,
      answers,
      sources: {},
    });
  });
});

describe('sources', () => {
  const sources = {
    intervjuer: { kind: 'template' as const, id: 'daglig-leder' },
    jobbsoker: { kind: 'profile' as const, id: 'profile-1' },
  };

  it('reads back the sources that were saved', () => {
    const stored = readStoredAnswers(toStoredDescription(interviewer, answers, sources));

    expect(stored?.sources).toEqual(sources);
  });

  it('reads an agent saved before sources existed as having none', () => {
    const description = JSON.stringify({ type: 'interviewer', version: 1, answers });

    expect(readStoredAnswers(description)?.sources).toEqual({});
  });

  it('keeps only valid sources for fields the agent type has', () => {
    expect(
      cleanSources(interviewer, {
        intervjuer: { kind: 'template', id: 'daglig-leder', extra: 'borte' },
        jobbsoker: { kind: 'robot', id: 'x' },
        bransje: { kind: 'profile', id: '' },
        gammeltFelt: { kind: 'profile', id: 'profile-1' },
      }),
    ).toEqual({ intervjuer: { kind: 'template', id: 'daglig-leder' } });
    expect(cleanSources(interviewer, 'ikke et objekt')).toEqual({});
  });
});

describe('readStoredAnswers', () => {
  it('reads an agent saved before agent types existed as an interviewer', () => {
    const oldDescription = JSON.stringify(answers);
    expect(readStoredAnswers(oldDescription)).toEqual({
      definition: interviewer,
      answers,
      sources: {},
    });
  });

  it('returns null for an unknown agent type', () => {
    const description = JSON.stringify({ type: 'robot', version: 1, answers });
    expect(readStoredAnswers(description)).toBeNull();
  });

  it('leaves an answer empty when the agent type got a new field after saving', () => {
    const savedBeforeBedriftExisted: Answers = { ...answers };
    delete savedBeforeBedriftExisted.bedrift;
    const stored = readStoredAnswers(toStoredDescription(interviewer, savedBeforeBedriftExisted));

    expect(stored?.answers).toEqual({ ...answers, bedrift: '' });
  });

  it('leaves out answers to fields the agent type no longer has', () => {
    const stored = readStoredAnswers(
      toStoredDescription(interviewer, { ...answers, gammeltFelt: 'borte' }),
    );

    expect(stored?.answers).toEqual(answers);
  });

  it('returns null for a description that is not our JSON', () => {
    expect(readStoredAnswers('En vanlig beskrivelse')).toBeNull();
    expect(readStoredAnswers('"bare tekst"')).toBeNull();
    expect(readStoredAnswers('{"tittel":"Noe helt annet"}')).toBeNull();
  });
});
