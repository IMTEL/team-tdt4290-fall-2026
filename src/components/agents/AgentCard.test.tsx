import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { Agent } from '@/lib/types';
import { AgentCard } from './AgentCard';

const agent: Agent = {
  id: 'agent-1',
  name: 'Butikksjef Kari',
  description: '',
  lastUpdated: '2026-10-02T12:00:00.000Z',
  llmModel: 'openai/gpt-oss-120b',
  temperature: 0.7,
  prompt: 'Du er en intervjuer.',
  type: 'interviewer',
  typeLabel: 'Intervjuer',
  stilling: 'Butikkmedarbeider',
  bransje: 'Varehandel (privat)',
  vanskelighetsgrad: 'middels',
};

describe('AgentCard', () => {
  it('shows the name, the role and the summary', () => {
    render(<AgentCard agent={agent} />);

    expect(screen.getByRole('heading', { name: 'Butikksjef Kari' })).toBeVisible();
    expect(screen.getByText('Intervjuer')).toBeVisible();
    expect(screen.getByText('Butikkmedarbeider · Middels')).toBeVisible();
  });

  it('shows only the name when there is no role or summary', () => {
    const unknown = { ...agent, typeLabel: null, stilling: null, vanskelighetsgrad: null };

    render(<AgentCard agent={unknown} />);

    const card = screen.getByRole('link', { name: /Butikksjef Kari/ });
    expect(card).toHaveTextContent(/^Butikksjef Kari$/);
  });

  it('shows the agent’s avatar inside the link to the agent’s page', () => {
    const { container } = render(<AgentCard agent={{ ...agent, avatar: 'rev' }} />);

    const image = container.querySelector('img');
    expect(image).toHaveAttribute('src', '/avatars/rev.svg');
    expect(screen.getByRole('link', { name: /Butikksjef Kari/ })).toContainElement(image);
  });

  it.each([
    ['has no avatar', null],
    ['was saved before avatars existed', undefined],
    ['has an avatar we no longer have', 'fjernet-avatar'],
  ])('shows the default image when the agent %s', (_, avatar) => {
    const { container } = render(<AgentCard agent={{ ...agent, avatar }} />);

    expect(container.querySelector('img')).toHaveAttribute('src', '/avatars/default.svg');
  });

  it('keeps the test button outside the link to the agent’s page', () => {
    render(<AgentCard agent={agent} />);

    const card = screen.getByRole('link', { name: /Butikksjef Kari/ });
    const testButton = screen.getByRole('link', { name: 'Test agenten' });
    expect(card).toHaveAttribute('href', '/browse-agents/agent-1');
    expect(testButton).toHaveAttribute('href', '/test-chat?agent=agent-1');
    expect(card).not.toContainElement(testButton);
  });

  it('encodes the id in both links', () => {
    render(<AgentCard agent={{ ...agent, id: 'agent/1' }} />);

    expect(screen.getByRole('link', { name: /Butikksjef Kari/ })).toHaveAttribute(
      'href',
      '/browse-agents/agent%2F1',
    );
    expect(screen.getByRole('link', { name: 'Test agenten' })).toHaveAttribute(
      'href',
      '/test-chat?agent=agent%2F1',
    );
  });
});
