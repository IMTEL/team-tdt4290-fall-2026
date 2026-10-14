import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('shows a typing bubble only while the assistant is answering', () => {
    const { rerender } = render(<MessageList messages={messages} />);
    expect(screen.queryByText('Assistenten skriver …')).not.toBeInTheDocument();

    rerender(<MessageList messages={messages} isTyping />);
    expect(screen.getByText('Assistenten skriver …')).toBeInTheDocument();
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
      render(<MessageList messages={[...messages, question]} onAnswer={onAnswer} />);

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
      render(<MessageList messages={answered} onAnswer={vi.fn()} />);

      expect(screen.queryByRole('button', { name: '1. Offentlig' })).not.toBeInTheDocument();
      expect(
        screen.getByText(/Offentlig eller privat\?\s+1\. Offentlig\s+2\. Privat/),
      ).toBeInTheDocument();
    });

    it('hides the options while the assistant is answering', () => {
      render(<MessageList messages={[...messages, question]} onAnswer={vi.fn()} isTyping />);

      expect(screen.queryByRole('button', { name: '1. Offentlig' })).not.toBeInTheDocument();
    });
  });
});
