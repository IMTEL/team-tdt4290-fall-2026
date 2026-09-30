'use client';

import { useEffect, useReducer, useRef } from 'react';

import { ChatError } from './sendToAgent';
import type { ChatMessage, SendMessages } from './types';

type ChatStatus = { kind: 'idle' } | { kind: 'waiting' } | { kind: 'error'; message: string };

export type ChatState = { messages: ChatMessage[]; status: ChatStatus };

export type ChatAction =
  | { type: 'sent'; message: ChatMessage } // the user sent a message
  | { type: 'replied'; message: ChatMessage } // the agent answered
  | { type: 'failed'; error: string } // the request failed
  | { type: 'retried' }; // the user clicked "Prøv igjen"

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'sent':
      if (state.status.kind !== 'idle') return state; // can't send while waiting or after an error
      return { messages: [...state.messages, action.message], status: { kind: 'waiting' } };

    case 'replied':
      if (state.status.kind !== 'waiting') return state;
      return { messages: [...state.messages, action.message], status: { kind: 'idle' } };

    case 'failed':
      if (state.status.kind !== 'waiting') return state;
      return { messages: state.messages, status: { kind: 'error', message: action.error } };

    case 'retried':
      if (state.status.kind !== 'error') return state;
      return { messages: state.messages, status: { kind: 'waiting' } };
  }
}

export function useChat(send: SendMessages, initialMessages: ChatMessage[]) {
  const [state, dispatch] = useReducer(chatReducer, {
    messages: initialMessages,
    status: { kind: 'idle' },
  });
  const requestRef = useRef<AbortController | null>(null);

  // Cancel a pending request if the user leaves the page.
  useEffect(() => () => requestRef.current?.abort(), []);

  async function requestReply(history: ChatMessage[]) {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;

    try {
      const reply = await send(history, controller.signal);
      dispatch({
        type: 'replied',
        message: { id: crypto.randomUUID(), role: 'assistant', content: reply },
      });
    } catch (error) {
      if (controller.signal.aborted) return;
      // Only ChatError messages are written for users; anything else could be technical.
      dispatch({
        type: 'failed',
        error: error instanceof ChatError ? error.userMessage : 'Noe gikk galt. Prøv igjen.',
      });
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
    }
  }

  function sendMessage(text: string) {
    const message: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: text };
    dispatch({ type: 'sent', message });
    void requestReply([...state.messages, message]);
  }

  // The user's last message is already in the list, so retrying just asks again.
  // This way the history never has two user turns in a row.
  function retry() {
    dispatch({ type: 'retried' });
    void requestReply(state.messages);
  }

  return {
    messages: state.messages,
    isWaiting: state.status.kind === 'waiting',
    error: state.status.kind === 'error' ? state.status.message : null,
    sendMessage,
    retry,
  };
}
