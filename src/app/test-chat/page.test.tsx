import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import TestChatPage, { metadata } from './page';

// TestChat looks the agent up among the counsellor's agents (tested in TestChat.test.tsx).
vi.mock('@/app/browse-agents/api', () => ({
  fetchAgents: vi.fn().mockResolvedValue([
    {
      id: 'agent-1',
      name: 'Intervjuer',
      description: '',
      lastUpdated: '2026-10-09T10:00:00Z',
      llmModel: 'openai/gpt-oss-120b',
      temperature: 0.7,
      prompt: 'Du er en intervjuer.',
    },
  ]),
}));

// The page is an async server component: await it, then render what it returns.
async function renderPage(searchParams: { agent?: string | string[] }) {
  render(await TestChatPage({ searchParams: Promise.resolve(searchParams) }));
}

describe('/test-chat', () => {
  it('renders the heading and the chat for the agent in the URL', async () => {
    await renderPage({ agent: 'agent-1' });

    expect(screen.getByRole('heading', { level: 1, name: 'Test intervjueren' })).toBeVisible();
    expect(await screen.findByRole('log', { name: 'Samtale' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Melding' })).toBeInTheDocument();
  });

  it('asks the counsellor to pick an agent when the URL has none', async () => {
    await renderPage({});

    expect(screen.queryByRole('textbox', { name: 'Melding' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'agentene dine' })).toHaveAttribute(
      'href',
      '/browse-agents',
    );
  });

  it('sets a Norwegian tab title', () => {
    expect(metadata.title).toBe('Test intervjuer');
  });
});
