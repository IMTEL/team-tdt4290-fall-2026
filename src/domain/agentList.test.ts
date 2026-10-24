// @vitest-environment node
import { describe, expect, it } from 'vitest';

import type { Agent } from '@/lib/types';
import {
  agentCardDetail,
  agentInterviewer,
  agentRole,
  agentSummary,
  groupAgentsByType,
  searchAgents,
} from './agentList';
import { getAgentType } from './agentTypes/registry';
import { toStoredDescription } from './agentTypes/storedAnswers';

function makeAgent(fields: Partial<Agent> = {}): Agent {
  return {
    id: 'a1',
    name: 'Kari',
    description: '',
    lastUpdated: '2026-10-01T08:00:00.000Z',
    llmModel: 'openai/gpt-oss-120b',
    temperature: 0.7,
    prompt: 'Du er en intervjuer.',
    type: 'interviewer',
    typeLabel: 'Intervjuer',
    stilling: 'Butikkmedarbeider',
    bransje: 'Varehandel (privat)',
    vanskelighetsgrad: 'middels',
    ...fields,
  };
}

describe('agentSummary', () => {
  it('shows the position and the difficulty', () => {
    expect(agentSummary(makeAgent())).toBe('Butikkmedarbeider · Middels');
  });

  it('shows only the level when the chat added more to the difficulty', () => {
    const agent = makeAgent({ vanskelighetsgrad: 'lett | Antall spørsmål: 6' });
    expect(agentSummary(agent)).toBe('Butikkmedarbeider · Lett');
  });

  it('uses only the job title when the position includes the whole description', () => {
    const agent = makeAgent({
      stilling: 'Lagermedarbeider. Lagermedarbeider på et lager eller en terminal. Tar imot varer.',
      vanskelighetsgrad: 'krevende',
    });

    expect(agentSummary(agent)).toBe('Lagermedarbeider · Krevende');
  });

  it('leaves out what is missing', () => {
    expect(agentSummary(makeAgent({ vanskelighetsgrad: null }))).toBe('Butikkmedarbeider');
    expect(agentSummary(makeAgent({ stilling: '  ' }))).toBe('Middels');
  });

  it('is empty when there is nothing to show', () => {
    expect(agentSummary(makeAgent({ stilling: null, vanskelighetsgrad: undefined }))).toBe('');
  });
});

describe('the card lines', () => {
  it('shows the interviewer with a capital letter, and the interview type as one sentence', () => {
    const agent = makeAgent({ intervjuer: 'butikksjef, vennlig', intervjutype: 'første intervju' });

    expect(agentInterviewer(agent)).toBe('Butikksjef, vennlig');
    expect(agentCardDetail(agent)).toBe('Første intervju.');
  });

  it('uses the template name for a long persona, and still shows the interview type', () => {
    const agent = makeAgent({
      intervjuer:
        'Intervjueren er daglig leder i en mindre bedrift og ansetter selv. Hen er direkte.',
      intervjuerMal: 'Daglig leder',
      intervjutype: 'første intervju',
    });

    expect(agentInterviewer(agent)).toBe('Daglig leder');
    expect(agentCardDetail(agent)).toBe('Første intervju.');
  });

  it('is empty when those answers are missing', () => {
    const agent = makeAgent({ intervjuer: '  ', intervjutype: null });

    expect(agentInterviewer(agent)).toBe('');
    expect(agentCardDetail(agent)).toBe('');
  });
});

describe('agentRole', () => {
  it('is the name of the agent type', () => {
    expect(agentRole(makeAgent())).toBe('Intervjuer');
  });

  it('is empty when the type is unknown', () => {
    expect(agentRole(makeAgent({ typeLabel: null }))).toBe('');
  });
});

describe('groupAgentsByType', () => {
  it('puts the agents of each type in their own section, newest first', () => {
    const older = makeAgent({ id: 'old', lastUpdated: '2026-09-01T08:00:00.000Z' });
    const newer = makeAgent({ id: 'new', lastUpdated: '2026-10-05T08:00:00.000Z' });

    const sections = groupAgentsByType([older, newer]);

    expect(sections).toHaveLength(1);
    expect(sections[0]).toMatchObject({ key: 'interviewer', title: 'Intervjuer' });
    expect(sections[0].agents.map((agent) => agent.id)).toEqual(['new', 'old']);
  });

  it('puts agents we cannot read in "Andre agenter", last', () => {
    const unknown = makeAgent({ id: 'unknown', type: null });
    const removedType = makeAgent({ id: 'removed', type: 'quiz-master' });
    const interviewer = makeAgent({ id: 'interviewer' });

    const sections = groupAgentsByType([unknown, interviewer, removedType]);

    expect(sections.map((section) => section.title)).toEqual(['Intervjuer', 'Andre agenter']);
    expect(sections[1].agents.map((agent) => agent.id).sort()).toEqual(['removed', 'unknown']);
  });

  it('leaves out empty sections', () => {
    expect(groupAgentsByType([])).toEqual([]);
    expect(groupAgentsByType([makeAgent({ type: null })]).map((s) => s.key)).toEqual(['other']);
  });

  it('sorts by time even when the times are written differently, unreadable ones last', () => {
    const agents = [
      makeAgent({ id: 'broken', lastUpdated: 'undefined' }),
      makeAgent({ id: 'early', lastUpdated: '2026-10-05T08:00:00Z' }),
      makeAgent({ id: 'late', lastUpdated: '2026-10-05T08:00:00.500Z' }),
      makeAgent({ id: 'offset', lastUpdated: '2026-10-05T10:30:00+02:00' }),
    ];

    const [section] = groupAgentsByType(agents);

    expect(section.agents.map((agent) => agent.id)).toEqual(['offset', 'late', 'early', 'broken']);
  });

  it('does not change the list it is given', () => {
    const agents = [
      makeAgent({ id: 'old', lastUpdated: '2026-09-01T08:00:00.000Z' }),
      makeAgent({ id: 'new', lastUpdated: '2026-10-05T08:00:00.000Z' }),
    ];
    groupAgentsByType(agents);
    expect(agents.map((agent) => agent.id)).toEqual(['old', 'new']);
  });
});

describe('searchAgents', () => {
  // The answers behind the card fields, so the summary on the details page can be built.
  const description = toStoredDescription(getAgentType('interviewer')!, {
    stilling: 'Butikkmedarbeider',
    bransje: 'Varehandel (privat)',
    intervjutype: 'første intervju',
    vanskelighetsgrad: 'middels',
    jobbsoker: 'aldersgruppe 18–24 år; arbeidserfaring: ingen arbeidserfaring',
  });
  const shop = makeAgent({ id: 'shop', name: 'Kari i butikken', description });
  const kitchen = makeAgent({
    id: 'kitchen',
    name: 'Kokk Ola',
    stilling: 'Kokk. Kokk på en restaurant i sentrum.',
    bransje: 'Reiseliv og servering',
    vanskelighetsgrad: 'lett',
  });
  const agents = [shop, kitchen];

  const ids = (query: string) => searchAgents(agents, query).map((agent) => agent.id);

  it('keeps every agent for an empty search or only spaces', () => {
    expect(ids('')).toEqual(['shop', 'kitchen']);
    expect(ids('   ')).toEqual(['shop', 'kitchen']);
  });

  it('finds an agent by its name, in any case', () => {
    expect(ids('OLA')).toEqual(['kitchen']);
  });

  it('finds part of a word, so "butikk" finds Butikkmedarbeider', () => {
    expect(ids('butikk')).toEqual(['shop']);
  });

  it('looks in the industry and the difficulty the card shows', () => {
    expect(ids('servering')).toEqual(['kitchen']);
    expect(ids('middels')).toEqual(['shop']);
  });

  it('looks in the configuration summary, also at what the card does not show', () => {
    expect(ids('18–24')).toEqual(['shop']);
    expect(ids('ingen arbeidserfaring')).toEqual(['shop']);
  });

  it('keeps only the agents that have every word', () => {
    expect(ids('kokk lett')).toEqual(['kitchen']);
    expect(ids('kokk middels')).toEqual([]);
  });

  it('handles æ, ø and å', () => {
    expect(ids('FØRSTE')).toEqual(['shop']);
  });

  it('does not look in the system prompt', () => {
    const agent = makeAgent({ prompt: 'Du er en intervjuer. Hold deg til rollen.' });
    expect(searchAgents([agent], 'rollen')).toEqual([]);
  });

  it('searches only the name of an agent whose description is not ours', () => {
    const other = makeAgent({
      id: 'other',
      name: 'Fra RAGdoll',
      description: 'Laget i RAGdoll',
      type: null,
      typeLabel: null,
      stilling: null,
      bransje: null,
      vanskelighetsgrad: null,
    });
    expect(searchAgents([other], 'ragdoll').map((agent) => agent.id)).toEqual(['other']);
    expect(searchAgents([other], 'laget')).toEqual([]);
  });
});
