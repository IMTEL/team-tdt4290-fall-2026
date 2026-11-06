import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MessageList } from './MessageList';
import type { ChatMessage } from './types';

const messages: ChatMessage[] = [
  { id: '1', role: 'assistant', content: 'Hvilken stilling?' },
  { id: '2', role: 'user', content: 'Butikkmedarbeider' },
];

describe('MessageList', () => {
  it('shows the messages in order, each labelled with who is speaking', () => {
    render(<MessageList messages={messages} />);

    const items = within(screen.getByRole('log', { name: 'Samtale' })).getAllByRole('listitem');
    expect(items.map((li) => li.textContent)).toEqual([
      'Assistent:Hvilken stilling?',
      'Du:Butikkmedarbeider',
    ]);
  });

  it('shows a thinking bubble only while the assistant is answering', () => {
    const { rerender } = render(<MessageList messages={messages} />);
    expect(screen.queryByText('Tenker …')).not.toBeInTheDocument();
    expect(screen.getByRole('log', { name: 'Samtale' })).toHaveAttribute('aria-busy', 'false');

    rerender(<MessageList messages={messages} isTyping />);
    expect(screen.getByText('Tenker …')).toBeInTheDocument();
    expect(screen.getByRole('log', { name: 'Samtale' })).toHaveAttribute('aria-busy', 'true');
  });

  it('shows reply actions under assistant replies, with the user message each one answered', () => {
    const renderReplyActions = vi.fn((reply: ChatMessage, userMessage?: ChatMessage) => (
      <span>{`Vurder ${reply.id} (svar på ${userMessage?.id ?? 'ingen'})`}</span>
    ));
    const reply: ChatMessage = { id: '3', role: 'assistant', content: 'Hvorfor?' };
    render(<MessageList messages={[...messages, reply]} renderReplyActions={renderReplyActions} />);

    expect(screen.getByText('Vurder 1 (svar på ingen)')).toBeInTheDocument();
    expect(screen.getByText('Vurder 3 (svar på 2)')).toBeInTheDocument();
    // Never under the user's own messages.
    expect(renderReplyActions).not.toHaveBeenCalledWith(messages[1], expect.anything());
  });

  it('keeps the reply actions out of the live log', () => {
    render(
      <MessageList messages={messages} renderReplyActions={() => <span>Vurder svaret</span>} />,
    );

    expect(screen.getByText('Vurder svaret').closest('[aria-live]')).toHaveAttribute(
      'aria-live',
      'off',
    );
  });
});
