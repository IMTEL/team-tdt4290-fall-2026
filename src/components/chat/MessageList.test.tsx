import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { parseQuestionOptions } from '@/domain/questionOptions';
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

  describe('with answer options', () => {
    const question: ChatMessage = {
      id: '3',
      role: 'assistant',
      content: `Offentlig eller privat?

[ALTERNATIVER: ett]
1. Offentlig
2. Privat`,
    };

    it('lets the newest question be answered by clicking, without showing the block as text', async () => {
      const onAnswer = vi.fn();
      render(
        <MessageList
          messages={[...messages, question]}
          onAnswer={onAnswer}
          parseReply={parseQuestionOptions}
        />,
      );

      expect(screen.queryByText(/ALTERNATIVER/)).not.toBeInTheDocument();
      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: '2. Privat' }));

      expect(onAnswer).toHaveBeenCalledExactlyOnceWith('2. Privat');
    });

    it('shows the options of an older question as a numbered list', () => {
      const answered = [
        ...messages,
        question,
        { id: '4', role: 'user' as const, content: '2. Privat' },
      ];
      render(
        <MessageList messages={answered} onAnswer={vi.fn()} parseReply={parseQuestionOptions} />,
      );

      expect(screen.queryByRole('button', { name: '1. Offentlig' })).not.toBeInTheDocument();
      expect(
        screen.getByText(/Offentlig eller privat\?\s+1\. Offentlig\s+2\. Privat/),
      ).toBeInTheDocument();
    });

    it('hides the options while the assistant is answering', () => {
      render(
        <MessageList
          messages={[...messages, question]}
          onAnswer={vi.fn()}
          parseReply={parseQuestionOptions}
          isTyping
        />,
      );

      expect(screen.queryByRole('button', { name: '1. Offentlig' })).not.toBeInTheDocument();
    });

    it('shows the reply as it is for an agent that does not write options', () => {
      render(<MessageList messages={[...messages, question]} onAnswer={vi.fn()} />);

      expect(screen.queryByRole('button', { name: '1. Offentlig' })).not.toBeInTheDocument();
      expect(screen.getByText(/\[ALTERNATIVER: ett\]/)).toBeInTheDocument();
    });
  });
});
