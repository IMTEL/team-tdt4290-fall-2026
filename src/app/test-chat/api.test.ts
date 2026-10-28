// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TOO_MANY_MESSAGES } from '@/components/chat/sendToAgent';
import { rateReply, requestObserverFeedback, undoRating } from './api';

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

describe('requestObserverFeedback', () => {
  const messages = [
    { id: 'greeting', role: 'assistant' as const, content: 'Fortell om deg selv.' },
    { id: 'm1', role: 'user' as const, content: 'Jeg heter Kari.' },
  ];

  it('sends only role and content, and returns the feedback', async () => {
    const tooShort = { kind: 'too-short', reason: 'For kort.' };
    fetchMock.mockResolvedValue(Response.json({ feedback: tooShort }));

    await expect(requestObserverFeedback(messages)).resolves.toEqual(tooShort);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/test-chat/observer');
    expect(JSON.parse(init?.body as string)).toEqual({
      messages: [
        { role: 'assistant', content: 'Fortell om deg selv.' },
        { role: 'user', content: 'Jeg heter Kari.' },
      ],
    });
  });

  it('fails with a Norwegian message, never the server’s', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ error: 'Too many requests' }, { status: 429 }));
    await expect(requestObserverFeedback(messages)).rejects.toThrow(TOO_MANY_MESSAGES);

    fetchMock.mockResolvedValueOnce(
      Response.json({ error: 'Invalid response from RAGdoll API' }, { status: 502 }),
    );
    await expect(requestObserverFeedback(messages)).rejects.toThrow(
      'Kunne ikke lage en tilbakemelding. Prøv igjen.',
    );

    fetchMock.mockResolvedValueOnce(Response.json({ feedback: { kind: 'feedback' } }));
    await expect(requestObserverFeedback(messages)).rejects.toThrow(
      'Kunne ikke lage en tilbakemelding. Prøv igjen.',
    );
  });
});
