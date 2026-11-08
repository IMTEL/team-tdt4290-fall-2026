// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ChatError } from '@/components/chat/sendToAgent';
import type { ChatMessage } from '@/components/chat/types';
import { interviewer } from '@/domain/agentTypes/interviewer';
import { fetchSavedTemplates, saveConfiguredAgent, sendConfigurationTurn } from './api';

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

const messages: ChatMessage[] = [
  { id: 'greeting', role: 'assistant', content: 'Hei!' },
  { id: 'u1', role: 'user', content: 'Butikkmedarbeider' },
];

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe('sendConfigurationTurn', () => {
  it('sends the template id with only role and content, and returns the reply', async () => {
    fetchMock.mockResolvedValue(
      Response.json({ reply: 'Neste?', configuration: null, done: false }),
    );

    await expect(
      sendConfigurationTurn(
        interviewer,
        { templateId: 'teamleder', profileId: null, jobTemplateId: null },
        messages,
      ),
    ).resolves.toEqual({
      reply: 'Neste?',
      configuration: null,
      sources: {},
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/configure/turn');
    expect(JSON.parse(init?.body as string)).toEqual({
      agentType: 'interviewer',
      templateId: 'teamleder',
      messages: [
        { role: 'assistant', content: 'Hei!' },
        { role: 'user', content: 'Butikkmedarbeider' },
      ],
    });
  });

  it('sends no template id when the counsellor started without a template', async () => {
    fetchMock.mockResolvedValue(
      Response.json({ reply: 'Neste?', configuration: null, done: false }),
    );

    await sendConfigurationTurn(
      interviewer,
      { templateId: null, profileId: null, jobTemplateId: null },
      messages,
    );

    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init?.body as string)).not.toHaveProperty('templateId');
    expect(JSON.parse(init?.body as string)).not.toHaveProperty('profileId');
    expect(JSON.parse(init?.body as string)).not.toHaveProperty('jobTemplateId');
  });

  it('sends the profile id when the counsellor chose a profile', async () => {
    fetchMock.mockResolvedValue(
      Response.json({ reply: 'Neste?', configuration: null, done: false }),
    );

    await sendConfigurationTurn(
      interviewer,
      { templateId: null, profileId: 'profile-1', jobTemplateId: null },
      messages,
    );

    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init?.body as string)).toMatchObject({ profileId: 'profile-1' });
  });

  it('sends the industry template id when one was chosen', async () => {
    fetchMock.mockResolvedValue(
      Response.json({ reply: 'Neste?', configuration: null, done: false }),
    );

    await sendConfigurationTurn(
      interviewer,
      { templateId: null, profileId: null, jobTemplateId: 'servitor' },
      messages,
    );

    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init?.body as string)).toMatchObject({ jobTemplateId: 'servitor' });
  });

  it('returns the configuration when the server says it is done', async () => {
    fetchMock.mockResolvedValue(Response.json({ reply: 'Ferdig', configuration, done: true }));

    const result = await sendConfigurationTurn(
      interviewer,
      { templateId: 'teamleder', profileId: null, jobTemplateId: null },
      messages,
    );

    expect(result.configuration).toEqual(configuration);
  });

  it('returns the valid sources the server sends with a finished configuration', async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        reply: 'Ferdig',
        configuration,
        sources: {
          intervjuer: { kind: 'template', id: 'teamleder' },
          jobbsoker: { kind: 'unknown', id: 'profile-1' },
        },
        done: true,
      }),
    );

    const result = await sendConfigurationTurn(
      interviewer,
      { templateId: 'teamleder', profileId: null, jobTemplateId: null },
      messages,
    );

    expect(result.sources).toEqual({
      intervjuer: { kind: 'template', id: 'teamleder' },
    });
  });

  it('tells the user to log in again when the session has expired', async () => {
    fetchMock.mockResolvedValue(Response.json({ error: 'Not signed in' }, { status: 401 }));

    await expect(
      sendConfigurationTurn(
        interviewer,
        { templateId: 'teamleder', profileId: null, jobTemplateId: null },
        messages,
      ),
    ).rejects.toMatchObject({
      userMessage: expect.stringContaining('Logg inn'),
    });
  });

  it('asks the user to wait when too many messages were sent', async () => {
    fetchMock.mockResolvedValue(Response.json({ error: 'Too many requests' }, { status: 429 }));

    await expect(
      sendConfigurationTurn(
        interviewer,
        { templateId: 'teamleder', profileId: null, jobTemplateId: null },
        messages,
      ),
    ).rejects.toMatchObject({
      userMessage: expect.stringContaining('Vent litt'),
    });
  });

  it('throws a ChatError when the server cannot be reached', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(
      sendConfigurationTurn(
        interviewer,
        { templateId: 'teamleder', profileId: null, jobTemplateId: null },
        messages,
      ),
    ).rejects.toBeInstanceOf(ChatError);
  });
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
