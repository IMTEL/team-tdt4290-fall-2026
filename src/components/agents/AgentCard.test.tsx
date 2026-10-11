import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { Agent } from '@/lib/types';
import { AgentCard } from './AgentCard';

const agent: Agent = {
  id: 'agent-1',
  name: 'Butikksjef Kari',
  description: '',
  lastUpdated: '2026-10-02T12:00:00.000Z',
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

  it('keeps the test button outside the link to the agent’s page', () => {
    render(<AgentCard agent={agent} />);

    const card = screen.getByRole('link', { name: /Butikksjef Kari/ });
    const testButton = screen.getByRole('link', { name: 'Test agenten' });
    expect(card).toHaveAttribute('href', '/browse-agents/agent-1');
    expect(testButton).toHaveAttribute('href', '/test-chat?agent=agent-1');
    expect(card).not.toContainElement(testButton);
  });
});
