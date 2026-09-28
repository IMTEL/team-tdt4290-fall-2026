import { describe, expect, it } from 'vitest';

import type { ChatMessage } from './types';
import { chatReducer, type ChatAction, type ChatState } from './useChat';

const greeting: ChatMessage = { id: 'greeting', role: 'assistant', content: 'Hei!' };
const question: ChatMessage = { id: 'u1', role: 'user', content: 'Butikkmedarbeider' };
const answer: ChatMessage = { id: 'a1', role: 'assistant', content: 'Offentlig eller privat?' };

const idle: ChatState = { messages: [greeting], status: { kind: 'idle' } };
const waiting: ChatState = { messages: [greeting, question], status: { kind: 'waiting' } };
const failed: ChatState = {
  messages: [greeting, question],
  status: { kind: 'error', message: 'Noe gikk galt. Prøv igjen.' },
};

describe('chatReducer', () => {
  it('adds the user message and waits when a message is sent', () => {
    expect(chatReducer(idle, { type: 'sent', message: question })).toEqual(waiting);
  });

  it('adds the reply and goes back to idle when the agent answers', () => {
    expect(chatReducer(waiting, { type: 'replied', message: answer })).toEqual({
      messages: [greeting, question, answer],
      status: { kind: 'idle' },
    });
  });

  it('keeps the messages and shows the error when the request fails', () => {
    expect(chatReducer(waiting, { type: 'failed', error: 'Noe gikk galt. Prøv igjen.' })).toEqual(
      failed,
    );
  });

  it('waits again without touching the messages on retry', () => {
    expect(chatReducer(failed, { type: 'retried' })).toEqual(waiting);
  });

  it.each<[string, ChatState, ChatAction]>([
    ['sending while waiting', waiting, { type: 'sent', message: question }],
    ['sending after an error', failed, { type: 'sent', message: question }],
    ['a reply nobody asked for', idle, { type: 'replied', message: answer }],
    ['a reply after an error', failed, { type: 'replied', message: answer }],
    ['a failure while idle', idle, { type: 'failed', error: 'x' }],
    ['retrying without an error', idle, { type: 'retried' }],
    ['retrying while waiting', waiting, { type: 'retried' }],
  ])('ignores %s', (_, state, action) => {
    // Same object back: nothing changed, so React doesn't even re-render.
    expect(chatReducer(state, action)).toBe(state);
  });
});
