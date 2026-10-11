// @vitest-environment node
import { describe, expect, it } from 'vitest';

import type { Agent } from '@/lib/types';
import { agentRole, agentSummary, groupAgentsByType } from './agentList';

function makeAgent(fields: Partial<Agent> = {}): Agent {
  return {
    id: 'a1',
    name: 'Kari',
    description: '',
    lastUpdated: '2026-10-01T08:00:00.000Z',
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

  it('leaves out what is missing', () => {
    expect(agentSummary(makeAgent({ vanskelighetsgrad: null }))).toBe('Butikkmedarbeider');
    expect(agentSummary(makeAgent({ stilling: '  ' }))).toBe('Middels');
  });

  it('is empty when there is nothing to show', () => {
    expect(agentSummary(makeAgent({ stilling: null, vanskelighetsgrad: undefined }))).toBe('');
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

  it('does not change the list it is given', () => {
    const agents = [
      makeAgent({ id: 'old', lastUpdated: '2026-09-01T08:00:00.000Z' }),
      makeAgent({ id: 'new', lastUpdated: '2026-10-05T08:00:00.000Z' }),
    ];
    groupAgentsByType(agents);
    expect(agents.map((agent) => agent.id)).toEqual(['old', 'new']);
  });
});
