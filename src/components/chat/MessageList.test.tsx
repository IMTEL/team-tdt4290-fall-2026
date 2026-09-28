import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

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
});
