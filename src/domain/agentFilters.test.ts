// @vitest-environment node
import { describe, expect, it } from 'vitest';

import type { Agent } from '@/lib/types';
import {
  EMPTY_FILTERS,
  filterAgents,
  filterOptions,
  hasActiveFilters,
  parseBransje,
} from './agentFilters';

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
    intervjutype: 'første intervju',
    ...fields,
  };
}

const shop = makeAgent({ id: 'shop' });
const nurse = makeAgent({
  id: 'nurse',
  bransje: 'Helse og omsorg (offentlig) | Om bransjen: Turnus og pasientkontakt.',
  vanskelighetsgrad: 'krevende | Antall spørsmål: 6–8 | Oppfølgingsspørsmål: ja',
  intervjutype: 'andre intervju',
});
const kindergarten = makeAgent({
  id: 'kindergarten',
  bransje: 'Oppvekst og utdanning (offentlig)',
  vanskelighetsgrad: 'lett',
});
const unknown = makeAgent({
  id: 'unknown',
  type: null,
  typeLabel: null,
  bransje: null,
  vanskelighetsgrad: null,
  intervjutype: null,
});
const agents = [shop, nurse, kindergarten, unknown];

const ids = (list: Agent[]) => list.map((agent) => agent.id);

describe('parseBransje', () => {
  it('splits the industry from the sector and leaves out what the bransjemal adds', () => {
    expect(parseBransje('Helse og omsorg (offentlig) | Om bransjen: Turnus.')).toEqual({
      industry: 'Helse og omsorg',
      sector: 'offentlig',
    });
  });

  it('keeps an industry without a sector', () => {
    expect(parseBransje('Varehandel')).toEqual({ industry: 'Varehandel', sector: '' });
  });

  it('has no industry or sector for what was not given', () => {
    expect(parseBransje('Ingen bransje (ikke oppgitt)')).toEqual({ industry: '', sector: '' });
    expect(parseBransje(null)).toEqual({ industry: '', sector: '' });
    expect(parseBransje('  ')).toEqual({ industry: '', sector: '' });
  });
});

describe('hasActiveFilters', () => {
  it('is false with no filter chosen and true with one', () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, sector: 'privat' })).toBe(true);
  });
});

describe('filterOptions', () => {
  it('takes the choices from the agents, each once', () => {
    const options = filterOptions(agents);

    expect(options.role).toEqual([
      { value: 'other', label: 'Andre agenter' },
      { value: 'interviewer', label: 'Intervjuer' },
    ]);
    expect(options.industry.map((option) => option.label)).toEqual([
      'Helse og omsorg',
      'Oppvekst og utdanning',
      'Varehandel',
    ]);
    expect(options.sector).toEqual([
      { value: 'offentlig', label: 'Offentlig' },
      { value: 'privat', label: 'Privat' },
    ]);
    expect(options.interviewType.map((option) => option.label)).toEqual([
      'Andre intervju',
      'Første intervju',
    ]);
  });

  it('puts the difficulties from easy to hard, with only the level', () => {
    expect(filterOptions(agents).difficulty.map((option) => option.label)).toEqual([
      'Lett',
      'Middels',
      'Krevende',
    ]);
  });

  it('treats names that differ only in case as one choice', () => {
    const options = filterOptions([shop, makeAgent({ id: 'b', bransje: 'varehandel (privat)' })]);

    expect(options.industry).toEqual([{ value: 'varehandel', label: 'Varehandel' }]);
  });

  it('has no choices without agents', () => {
    expect(filterOptions([])).toEqual({
      role: [],
      industry: [],
      sector: [],
      interviewType: [],
      difficulty: [],
    });
  });
});

describe('filterAgents', () => {
  it('keeps every agent with no filter chosen', () => {
    expect(filterAgents(agents, EMPTY_FILTERS)).toBe(agents);
  });

  it('filters on each of the filters', () => {
    expect(ids(filterAgents(agents, { ...EMPTY_FILTERS, role: 'other' }))).toEqual(['unknown']);
    expect(ids(filterAgents(agents, { ...EMPTY_FILTERS, industry: 'varehandel' }))).toEqual([
      'shop',
    ]);
    expect(ids(filterAgents(agents, { ...EMPTY_FILTERS, sector: 'offentlig' }))).toEqual([
      'nurse',
      'kindergarten',
    ]);
    expect(
      ids(filterAgents(agents, { ...EMPTY_FILTERS, interviewType: 'andre intervju' })),
    ).toEqual(['nurse']);
    expect(ids(filterAgents(agents, { ...EMPTY_FILTERS, difficulty: 'krevende' }))).toEqual([
      'nurse',
    ]);
  });

  it('combines the filters: an agent must match all of them', () => {
    const publicAndEasy = { ...EMPTY_FILTERS, sector: 'offentlig', difficulty: 'lett' };
    expect(ids(filterAgents(agents, publicAndEasy))).toEqual(['kindergarten']);

    const noMatch = { ...EMPTY_FILTERS, sector: 'privat', difficulty: 'krevende' };
    expect(filterAgents(agents, noMatch)).toEqual([]);
  });

  it('leaves out agents without an answer for a chosen filter', () => {
    expect(ids(filterAgents(agents, { ...EMPTY_FILTERS, role: 'interviewer' }))).not.toContain(
      'unknown',
    );
    expect(ids(filterAgents(agents, { ...EMPTY_FILTERS, difficulty: 'middels' }))).toEqual([
      'shop',
    ]);
  });
});
