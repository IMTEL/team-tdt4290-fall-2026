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
  it('treats every saved agent as private until drafts and publishing exist', () => {
    expect(agentStatus(agent)).toBe('private');
    expect(AGENT_STATUS_LABEL.private).toBe('Privat');
    expect(AGENT_STATUS_LABEL.draft).toBe('Utkast');
    expect(AGENT_STATUS_LABEL.published).toBe('Publisert');
  });
});
