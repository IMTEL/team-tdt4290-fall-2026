// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchAgents } from './api';

const agent = {
  id: 'agent-1',
  name: 'Intervjuer for Barnehagelærer',
  description: '{"stilling":"Barnehagelærer"}',
  lastUpdated: '2026-10-02T12:00:00.000Z',
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
});
