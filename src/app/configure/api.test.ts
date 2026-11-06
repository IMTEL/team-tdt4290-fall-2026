// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { interviewer } from '@/domain/agentTypes/interviewer';
import { fetchSavedTemplates, saveConfiguredAgent } from './api';

const configuration = {
  stilling: 'Butikkmedarbeider',
  bransje: 'Varehandel (privat)',
  bedrift: 'Nærbutikken AS',
  intervjutype: 'første intervju',
  intervjuer: 'butikksjef, vennlig',
  jobbsoker: 'under 25, lite erfaring',
  vanskelighetsgrad: 'lett | Antall spørsmål: 6 | Oppfølgingsspørsmål: ja',
  egneSporsmal: 'ingen',
  tillegg: '',
};

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe('saveConfiguredAgent', () => {
  it('posts the name, configuration and sources and returns the new id', async () => {
    fetchMock.mockResolvedValue(Response.json({ id: 'agent-1' }, { status: 201 }));
    const sources = { intervjuer: { kind: 'template' as const, id: 'daglig-leder' } };

    await expect(saveConfiguredAgent('Kari', interviewer, configuration, sources)).resolves.toBe(
      'agent-1',
    );

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/agents');
    expect(JSON.parse(init?.body as string)).toEqual({
      name: 'Kari',
      type: 'interviewer',
      configuration,
      sources,
    });
  });

  it('posts the advanced settings when there are any', async () => {
    fetchMock.mockResolvedValue(Response.json({ id: 'agent-1' }, { status: 201 }));
    const advanced = {
      model: 'meta/llama-3.3-70b',
      temperature: 0.2,
      maxTokens: 1000,
      customPrompt: 'Du er Kari.',
    };

    await saveConfiguredAgent('Kari', interviewer, configuration, {}, advanced);

    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init?.body as string)).toEqual({
      name: 'Kari',
      type: 'interviewer',
      configuration,
      sources: {},
      advanced,
    });
  });

  it('says what to check when the server does not accept the agent', async () => {
    fetchMock.mockResolvedValue(Response.json({ error: 'Invalid name' }, { status: 400 }));

    await expect(saveConfiguredAgent('Kari', interviewer, configuration)).rejects.toMatchObject({
      userMessage: 'Agenten ble ikke godtatt. Sjekk navnet og de avanserte innstillingene.',
    });
  });

  it('throws a ChatError with a safe message when saving fails', async () => {
    fetchMock.mockResolvedValue(
      Response.json({ error: 'Error from RAGdoll API' }, { status: 502 }),
    );

    await expect(saveConfiguredAgent('Kari', interviewer, configuration)).rejects.toMatchObject({
      userMessage: 'Noe gikk galt. Prøv igjen.',
    });
  });
});

describe('fetchSavedTemplates', () => {
  const saved = {
    id: 'saved-1',
    agentType: 'interviewer',
    title: 'Butikksjef',
    description: 'Vennlig.',
    focus: ['Service'],
    persona: 'Intervjueren er butikksjef.',
  };

  it('returns the saved templates', async () => {
    fetchMock.mockResolvedValue(Response.json({ templates: [saved] }));

    await expect(fetchSavedTemplates('interviewer')).resolves.toEqual([saved]);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/templates?agentType=interviewer');
  });

  it('throws when the server fails', async () => {
    fetchMock.mockResolvedValue(Response.json({ error: 'Not signed in' }, { status: 401 }));

    await expect(fetchSavedTemplates('interviewer')).rejects.toThrow();
  });

  it('throws when a template has the wrong shape', async () => {
    fetchMock.mockResolvedValue(Response.json({ templates: [{ ...saved, focus: 'Service' }] }));

    await expect(fetchSavedTemplates('interviewer')).rejects.toThrow();
  });
});
