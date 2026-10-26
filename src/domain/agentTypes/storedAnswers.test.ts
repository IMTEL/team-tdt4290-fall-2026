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
  tillegg: '',
  lovverk: '',
};

describe('toStoredDescription and readStoredAnswers', () => {
  it('reads back what was saved', () => {
    const description = toStoredDescription(interviewer, answers);
    expect(JSON.parse(description)).toMatchObject({ type: 'interviewer', version: 1 });
    expect(readStoredAnswers(description)).toEqual({
      definition: interviewer,
      answers,
      sources: {},
      customPrompt: false,
      avatar: null,
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

  it('keeps a list of legal templates, only for the field legal templates fill in', () => {
    expect(
      cleanSources(interviewer, {
        lovverk: { kind: 'legal', ids: ['builtin-legal-hiring-rights', 'legal-1'], extra: 'borte' },
        tillegg: { kind: 'legal', ids: ['legal-1'] },
      }),
    ).toEqual({ lovverk: { kind: 'legal', ids: ['builtin-legal-hiring-rights', 'legal-1'] } });
  });

  it('leaves out a legal source with no, empty, repeated or too many ids', () => {
    for (const ids of [[], [''], ['a', 'a'], ['1', '2', '3', '4', '5', '6'], 'legal-1']) {
      expect(cleanSources(interviewer, { lovverk: { kind: 'legal', ids } })).toEqual({});
    }
  });
});

describe('readStoredAnswers', () => {
  it('reads an agent saved before agent types existed as an interviewer', () => {
    const oldDescription = JSON.stringify(answers);
    expect(readStoredAnswers(oldDescription)).toEqual({
      definition: interviewer,
      answers,
      sources: {},
      customPrompt: false,
      avatar: null,
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

  it('reads back that the prompt was written by hand', () => {
    const description = toStoredDescription(interviewer, answers, {}, { customPrompt: true });
    expect(readStoredAnswers(description)?.customPrompt).toBe(true);
  });

  it('does not write the flag when the prompt is built from the answers', () => {
    expect(JSON.parse(toStoredDescription(interviewer, answers))).not.toHaveProperty(
      'customPrompt',
    );
  });
});

describe('avatar', () => {
  it('reads back the avatar that was saved', () => {
    const description = toStoredDescription(interviewer, answers, {}, { avatar: 'ugle' });

    expect(JSON.parse(description)).toMatchObject({ avatar: 'ugle' });
    expect(readStoredAnswers(description)?.avatar).toBe('ugle');
  });

  it('keeps the avatar next to the hand-written prompt flag', () => {
    const description = toStoredDescription(
      interviewer,
      answers,
      {},
      { customPrompt: true, avatar: 'rev' },
    );

    expect(readStoredAnswers(description)).toMatchObject({ customPrompt: true, avatar: 'rev' });
  });

  it('does not write an avatar when there is none, so old and new agents look the same', () => {
    expect(JSON.parse(toStoredDescription(interviewer, answers))).not.toHaveProperty('avatar');
    expect(
      JSON.parse(toStoredDescription(interviewer, answers, {}, { avatar: null })),
    ).not.toHaveProperty('avatar');
  });

  it('reads an agent saved before avatars existed as having none', () => {
    const description = JSON.stringify({ type: 'interviewer', version: 1, answers, sources: {} });

    expect(readStoredAnswers(description)?.avatar).toBeNull();
  });

  it('reads an avatar we no longer have as none, and does not write it', () => {
    const removed = JSON.stringify({ type: 'interviewer', version: 1, answers, avatar: 'drage' });

    expect(readStoredAnswers(removed)?.avatar).toBeNull();
    expect(
      JSON.parse(toStoredDescription(interviewer, answers, {}, { avatar: 'drage' })),
    ).not.toHaveProperty('avatar');
  });
});
