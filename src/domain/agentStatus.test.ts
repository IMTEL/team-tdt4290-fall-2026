import { describe, expect, it } from 'vitest';

import type { Agent } from '@/lib/types';
import { AGENT_STATUS_LABEL, agentStatus } from './agentStatus';

const agent: Agent = {
  id: 'agent-1',
  name: 'Butikksjef Kari',
  description: '',
  lastUpdated: '2026-10-02T12:00:00.000Z',
  llmModel: 'openai/gpt-oss-120b',
  temperature: 0.7,
  prompt: 'Du er en intervjuer.',
};

describe('agentStatus', () => {
  it('is published when The Candidate lists the agent, and private otherwise', () => {
    expect(agentStatus({ ...agent, isPublished: true })).toBe('published');
    expect(agentStatus({ ...agent, isPublished: false })).toBe('private');
  });

  it('treats an agent saved before publishing existed as private', () => {
    expect(agentStatus(agent)).toBe('private');
  });

  it('has a Norwegian label for each status', () => {
    expect(AGENT_STATUS_LABEL.private).toBe('Privat');
    expect(AGENT_STATUS_LABEL.draft).toBe('Utkast');
    expect(AGENT_STATUS_LABEL.published).toBe('Publisert');
  });
});
