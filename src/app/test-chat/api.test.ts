// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { rateReply, undoRating } from './api';

const feedback = {
  rating: 'good' as const,
  agentMessage: 'Hvorfor søker du denne stillingen?',
  userMessage: 'Hei, jeg heter Kari.',
  comment: 'Godt oppfølgingsspørsmål.',
};
const stored = { ...feedback, id: 'feedback-1', createdAt: '2026-10-21T10:00:00' };

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe('rateReply', () => {
  it('posts the rating to the agent and returns it with its id', async () => {
    fetchMock.mockResolvedValue(Response.json({ feedback: stored }, { status: 201 }));

    await expect(rateReply('agent-1', feedback)).resolves.toEqual(stored);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/agents/agent-1/feedback');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toEqual(feedback);
  });

  it('cuts a very long reply to what RAGdoll stores', async () => {
    fetchMock.mockResolvedValue(Response.json({ feedback: stored }, { status: 201 }));

    await rateReply('agent-1', { ...feedback, agentMessage: 'a'.repeat(5000) });

    const sent = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
    expect(sent.agentMessage).toHaveLength(4000);
  });

  it('never cuts an emoji in half', async () => {
    fetchMock.mockResolvedValue(Response.json({ feedback: stored }, { status: 201 }));

    // The emoji takes two UTF-16 units, at positions 3999 and 4000.
    await rateReply('agent-1', { ...feedback, agentMessage: `${'a'.repeat(3999)}🙂b` });

    const sent = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
    expect(sent.agentMessage).toBe('a'.repeat(3999));
  });

  it('fails with a Norwegian message, never the server’s', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ error: 'Not found' }, { status: 404 }));
    await expect(rateReply('agent-1', feedback)).rejects.toThrow(
      'Fant ikke intervjueren. Den kan være slettet.',
    );

    fetchMock.mockResolvedValueOnce(Response.json({ error: 'upstream' }, { status: 502 }));
    await expect(rateReply('agent-1', feedback)).rejects.toThrow(
      'Kunne ikke lagre vurderingen. Prøv igjen.',
    );

    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(rateReply('agent-1', feedback)).rejects.toThrow(/Fikk ikke kontakt/);
  });

  it('fails when the answer is not a rating', async () => {
    fetchMock.mockResolvedValue(Response.json({ feedback: { id: 'feedback-1' } }));

    await expect(rateReply('agent-1', feedback)).rejects.toThrow(
      'Kunne ikke lagre vurderingen. Prøv igjen.',
    );
  });
});

describe('undoRating', () => {
  it('deletes the rating', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(undoRating('agent-1', 'feedback-1')).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith('/api/agents/agent-1/feedback/feedback-1', {
      method: 'DELETE',
    });
  });

  it('fails on 404, since the rating may still be stored', async () => {
    fetchMock.mockResolvedValue(Response.json({ error: 'Not found' }, { status: 404 }));

    await expect(undoRating('agent-1', 'feedback-1')).rejects.toThrow(
      'Fant ikke intervjueren. Den kan være slettet.',
    );
  });

  it('fails with a Norwegian message', async () => {
    fetchMock.mockResolvedValue(Response.json({ error: 'upstream' }, { status: 502 }));

    await expect(undoRating('agent-1', 'feedback-1')).rejects.toThrow(
      'Kunne ikke angre vurderingen. Prøv igjen.',
    );
  });
});
