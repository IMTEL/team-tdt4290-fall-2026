import type { Agent } from '@/lib/types';

/** Where an agent is for the counsellor: still a draft, private, or published to The Candidate. */
export type AgentStatus = 'draft' | 'private' | 'published';

export const AGENT_STATUS_LABEL: Record<AgentStatus, string> = {
  draft: 'Utkast',
  private: 'Privat',
  published: 'Publisert',
};

/**
 * A saved agent is private to the counsellor until it is published to The Candidate. An unfinished
 * wizard is an utkast, and is shown as its own card, not as an agent.
 */
export function agentStatus(agent: Agent): AgentStatus {
  return agent.isPublished ? 'published' : 'private';
}
