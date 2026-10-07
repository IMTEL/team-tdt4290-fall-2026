// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ChatError } from '@/components/chat/sendToAgent';
import type { ChatMessage } from '@/components/chat/types';
import { saveConfiguredAgent, sendConfigurationTurn } from './api';

const configuration = {
  stilling: 'Butikkmedarbeider',
  bransje: 'Varehandel (privat)',
  bedrift: 'Nærbutikken AS',
  intervjutype: 'første intervju',
  intervjuer: 'butikksjef, vennlig',
  jobbsoker: 'under 25, lite erfaring',
  vanskelighetsgrad: 'lett | Antall spørsmål: 6 | Oppfølgingsspørsmål: ja',
  egneSporsmal: 'ingen',
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

    await expect(sendConfigurationTurn('teamleder', messages)).resolves.toEqual({
      reply: 'Neste?',
      configuration: null,
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/configure/turn');
    expect(JSON.parse(init?.body as string)).toEqual({
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

    await sendConfigurationTurn(null, messages);

    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init?.body as string)).not.toHaveProperty('templateId');
  });

  it('returns the configuration when the server says it is done', async () => {
    fetchMock.mockResolvedValue(Response.json({ reply: 'Ferdig', configuration, done: true }));

    const result = await sendConfigurationTurn('teamleder', messages);

    expect(result.configuration).toEqual(configuration);
  });

  it('tells the user to log in again when the session has expired', async () => {
    fetchMock.mockResolvedValue(Response.json({ error: 'Not signed in' }, { status: 401 }));

    await expect(sendConfigurationTurn('teamleder', messages)).rejects.toMatchObject({
      userMessage: expect.stringContaining('Logg inn'),
    });
  });

  it('throws a ChatError when the server cannot be reached', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(sendConfigurationTurn('teamleder', messages)).rejects.toBeInstanceOf(ChatError);
  });
});

describe('saveConfiguredAgent', () => {
  it('posts the name and configuration and returns the new id', async () => {
    fetchMock.mockResolvedValue(Response.json({ id: 'agent-1' }, { status: 201 }));

    await expect(saveConfiguredAgent('Kari', configuration)).resolves.toBe('agent-1');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/agents');
    expect(JSON.parse(init?.body as string)).toEqual({ name: 'Kari', configuration });
  });

  it('throws a ChatError with a safe message when saving fails', async () => {
    fetchMock.mockResolvedValue(
      Response.json({ error: 'Error from RAGdoll API' }, { status: 502 }),
    );

    await expect(saveConfiguredAgent('Kari', configuration)).rejects.toMatchObject({
      userMessage: 'Noe gikk galt. Prøv igjen.',
    });
  });
});
