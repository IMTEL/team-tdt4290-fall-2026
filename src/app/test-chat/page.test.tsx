import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import TestChatPage, { metadata } from './page';

describe('/test-chat', () => {
  it('renders the heading and the chat', () => {
    render(<TestChatPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'Test intervjueren' })).toBeVisible();
    expect(screen.getByRole('log', { name: 'Samtale' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Melding' })).toBeInTheDocument();
  });

  it('sets a Norwegian tab title', () => {
    expect(metadata.title).toBe('Test intervjuer');
  });
});
