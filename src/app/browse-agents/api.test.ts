// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  cloneAgent,
  deleteAgent,
  fetchAgents,
  publishAgent,
  unpublishAgent,
  updateAgent,
} from './api';

const agent = {
  id: 'agent-1',
  name: 'Intervjuer for Barnehagelærer',
  description: '{"stilling":"Barnehagelærer"}',
  lastUpdated: '2026-10-02T12:00:00.000Z',
  llmModel: 'openai/gpt-oss-120b',
  temperature: 0.7,
  prompt: 'Du er en intervjuer.',
};

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe('fetchAgents', () => {
  it('loads the list without caching, including an empty list', async () => {
    fetchMock.mockResolvedValue(Response.json({ agents: [] }));

    await expect(fetchAgents()).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledWith('/api/agents', { cache: 'no-store' });
  });

  it('returns the agents from the response', async () => {
    fetchMock.mockResolvedValue(Response.json({ agents: [agent] }));

    await expect(fetchAgents()).resolves.toEqual([agent]);
  });

  it('fails when the request does not succeed', async () => {
    fetchMock.mockResolvedValue(Response.json({ error: 'upstream' }, { status: 502 }));

    await expect(fetchAgents()).rejects.toThrow('Noe gikk galt. Prøv igjen.');
  });

  it('fails when the body is not a list of agents', async () => {
    fetchMock.mockResolvedValue(Response.json({ agents: [{ id: 'agent-1' }] }));

    await expect(fetchAgents()).rejects.toThrow('Noe gikk galt. Prøv igjen.');
  });

  it('accepts an agent with an avatar, and one without', async () => {
    fetchMock.mockResolvedValue(
      Response.json({ agents: [{ ...agent, avatar: 'ugle' }, { ...agent, avatar: null }, agent] }),
    );

    await expect(fetchAgents()).resolves.toHaveLength(3);
  });

  it('fails when an agent’s avatar is not text', async () => {
    fetchMock.mockResolvedValue(Response.json({ agents: [{ ...agent, avatar: 7 }] }));

    await expect(fetchAgents()).rejects.toThrow('Noe gikk galt. Prøv igjen.');
  });

  it('fails when an agent has no advanced settings', async () => {
    const withoutModel: Record<string, unknown> = { ...agent };
    delete withoutModel.llmModel;
    fetchMock.mockResolvedValue(Response.json({ agents: [withoutModel] }));

    await expect(fetchAgents()).rejects.toThrow('Noe gikk galt. Prøv igjen.');
  });

  it('keeps the fields the cards use, also when they are null', async () => {
    const listed = {
      ...agent,
      type: 'interviewer',
      typeLabel: 'Intervjuer',
      stilling: 'Barnehagelærer',
      bransje: null,
      vanskelighetsgrad: null,
    };
    fetchMock.mockResolvedValue(Response.json({ agents: [listed] }));

    await expect(fetchAgents()).resolves.toEqual([listed]);
  });

  it('fails when a card field is not text', async () => {
    fetchMock.mockResolvedValue(Response.json({ agents: [{ ...agent, stilling: 42 }] }));

    await expect(fetchAgents()).rejects.toThrow('Noe gikk galt. Prøv igjen.');
  });
});

describe('updateAgent', () => {
  const answers = { stilling: 'Barnehagelærer', bransje: 'Oppvekst' };

  it('sends the new name and answers to the agent and returns the saved agent', async () => {
    fetchMock.mockResolvedValue(Response.json({ agent }));

    const sources = { jobbsoker: { kind: 'profile' as const, id: 'profile-1' } };
    await expect(updateAgent('agent-1', 'Nytt navn', answers, sources)).resolves.toEqual(agent);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/agents/agent-1');
    expect(init?.method).toBe('PUT');
    expect(JSON.parse(init?.body as string)).toEqual({ name: 'Nytt navn', answers, sources });
  });

  it('sends the advanced settings when there are any', async () => {
    fetchMock.mockResolvedValue(Response.json({ agent }));
    const advanced = { model: 'meta/llama-3.3-70b', temperature: 0.2, customPrompt: null };

    await updateAgent('agent-1', 'Nytt navn', answers, {}, advanced);

    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init?.body as string)).toEqual({
      name: 'Nytt navn',
      answers,
      sources: {},
      advanced,
    });
  });

  it('sends the avatar, and null for the default image, but nothing when it is not changed', async () => {
    // A new response for each call: the body of a response can only be read once.
    fetchMock.mockImplementation(async () => Response.json({ agent }));

    await updateAgent('agent-1', 'Nytt navn', answers, {}, undefined, 'ugle');
    await updateAgent('agent-1', 'Nytt navn', answers, {}, undefined, null);
    await updateAgent('agent-1', 'Nytt navn', answers);

    const bodies = fetchMock.mock.calls.map(([, init]) => JSON.parse(init?.body as string));
    expect(bodies[0]).toHaveProperty('avatar', 'ugle');
    expect(bodies[1]).toHaveProperty('avatar', null);
    expect(bodies[2]).not.toHaveProperty('avatar');
  });

  it.each([
    [401, 'Du er logget ut. Logg inn på nytt og prøv igjen.'],
    [400, 'Endringene ble ikke godtatt. Sjekk feltene og prøv igjen.'],
    [404, 'Fant ikke agenten. Den kan ha blitt slettet.'],
    [504, 'Det tok for lang tid å få svar. Prøv igjen.'],
    [502, 'Noe gikk galt. Prøv igjen.'],
  ])('gives a Norwegian message when the server answers %i', async (status, message) => {
    fetchMock.mockResolvedValue(Response.json({ error: 'Agent not found' }, { status }));

    await expect(updateAgent('agent-1', 'Nytt navn', answers)).rejects.toThrow(message);
  });

  it('gives a network message when the server cannot be reached', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(updateAgent('agent-1', 'Nytt navn', answers)).rejects.toThrow(
      'Fikk ikke kontakt med serveren. Sjekk nettverket og prøv igjen.',
    );
  });

  it('fails when the answer is not an agent', async () => {
    fetchMock.mockResolvedValue(Response.json({ agent: { id: 'agent-1' } }));

    await expect(updateAgent('agent-1', 'Nytt navn', answers)).rejects.toThrow(
      'Noe gikk galt. Prøv igjen.',
    );
  });
});

describe('cloneAgent', () => {
  const answers = { stilling: 'Barnehagelærer', bransje: 'Oppvekst' };

  it('sends the name and answers to the original agent and returns the new id', async () => {
    fetchMock.mockResolvedValue(Response.json({ id: 'agent-2' }, { status: 201 }));

    await expect(cloneAgent('agent-1', 'Kopi', answers)).resolves.toBe('agent-2');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/agents/agent-1/clone');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toEqual({ name: 'Kopi', answers, sources: {} });
  });

  it('sends the advanced settings when there are any', async () => {
    fetchMock.mockResolvedValue(Response.json({ id: 'agent-2' }, { status: 201 }));
    const advanced = { model: 'meta/llama-3.3-70b', temperature: 1.1, customPrompt: null };

    await cloneAgent('agent-1', 'Kopi', answers, {}, advanced);

    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init?.body as string)).toEqual({
      name: 'Kopi',
      answers,
      sources: {},
      advanced,
    });
  });

  it('sends the avatar, and null for the default image, but nothing when it is not changed', async () => {
    // A new response for each call: the body of a response can only be read once.
    fetchMock.mockImplementation(async () => Response.json({ id: 'agent-2' }, { status: 201 }));

    await cloneAgent('agent-1', 'Kopi', answers, {}, undefined, 'sol');
    await cloneAgent('agent-1', 'Kopi', answers, {}, undefined, null);
    await cloneAgent('agent-1', 'Kopi', answers);

    const bodies = fetchMock.mock.calls.map(([, init]) => JSON.parse(init?.body as string));
    expect(bodies[0]).toHaveProperty('avatar', 'sol');
    expect(bodies[1]).toHaveProperty('avatar', null);
    expect(bodies[2]).not.toHaveProperty('avatar');
  });

  it.each([
    [401, 'Du er logget ut. Logg inn på nytt og prøv igjen.'],
    [404, 'Fant ikke agenten. Den kan ha blitt slettet.'],
    [502, 'Noe gikk galt. Prøv igjen.'],
  ])('gives a Norwegian message when the server answers %i', async (status, message) => {
    fetchMock.mockResolvedValue(Response.json({ error: 'Agent not found' }, { status }));

    await expect(cloneAgent('agent-1', 'Kopi', answers)).rejects.toThrow(message);
  });

  it('gives a network message when the server cannot be reached', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(cloneAgent('agent-1', 'Kopi', answers)).rejects.toThrow(
      'Fikk ikke kontakt med serveren. Sjekk nettverket og prøv igjen.',
    );
  });

  it('fails when the answer has no id', async () => {
    fetchMock.mockResolvedValue(Response.json({}, { status: 201 }));

    await expect(cloneAgent('agent-1', 'Kopi', answers)).rejects.toThrow(
      'Noe gikk galt. Prøv igjen.',
    );
  });
});

describe('deleteAgent', () => {
  it('asks the server to delete the agent', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(deleteAgent('agent-1')).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith('/api/agents/agent-1', { method: 'DELETE' });
  });

  it.each([
    [401, 'Du er logget ut. Logg inn på nytt og prøv igjen.'],
    [403, 'Bare eieren kan slette agenten.'],
    [404, 'Fant ikke agenten. Den kan ha blitt slettet.'],
    [502, 'Noe gikk galt. Prøv igjen.'],
  ])('gives a Norwegian message when the server answers %i', async (status, message) => {
    fetchMock.mockResolvedValue(Response.json({ error: 'Agent not found' }, { status }));

    await expect(deleteAgent('agent-1')).rejects.toThrow(message);
  });

  it('gives a network message when the server cannot be reached', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(deleteAgent('agent-1')).rejects.toThrow(
      'Fikk ikke kontakt med serveren. Sjekk nettverket og prøv igjen.',
    );
  });
});

describe('publishAgent and unpublishAgent', () => {
  const publication = {
    isPublished: true,
    publicName: 'Servitørintervju',
    publicDescription: 'Middels vanskelig',
  };

  it('sends the public name and description and returns the publication', async () => {
    fetchMock.mockResolvedValue(Response.json({ publication }));

    await expect(publishAgent('agent-1', 'Servitørintervju', 'Middels vanskelig')).resolves.toEqual(
      publication,
    );
    expect(fetchMock).toHaveBeenCalledWith('/api/agents/agent-1/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        publicName: 'Servitørintervju',
        publicDescription: 'Middels vanskelig',
      }),
    });
  });

  it('hides the agent with DELETE', async () => {
    const hidden = { ...publication, isPublished: false };
    fetchMock.mockResolvedValue(Response.json({ publication: hidden }));

    await expect(unpublishAgent('agent-1')).resolves.toEqual(hidden);
    expect(fetchMock).toHaveBeenCalledWith('/api/agents/agent-1/publish', { method: 'DELETE' });
  });

  it.each([
    [403, 'Bare eieren kan publisere eller gjemme agenten.'],
    [400, 'Navnet eller beskrivelsen ble ikke godtatt. Sjekk feltene og prøv igjen.'],
    [401, 'Du er logget ut. Logg inn på nytt og prøv igjen.'],
  ])('gives a Norwegian message when the server answers %i', async (status, message) => {
    fetchMock.mockResolvedValue(Response.json({ error: 'nope' }, { status }));

    await expect(publishAgent('agent-1', 'Navn', '')).rejects.toThrow(message);
  });

  it('gives a network message when the server cannot be reached', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(unpublishAgent('agent-1')).rejects.toThrow(
      'Fikk ikke kontakt med serveren. Sjekk nettverket og prøv igjen.',
    );
  });

  it('fails when the answer is not a publication', async () => {
    fetchMock.mockResolvedValue(Response.json({ publication: { isPublished: 'yes' } }));

    await expect(unpublishAgent('agent-1')).rejects.toThrow('Noe gikk galt. Prøv igjen.');
  });
});
