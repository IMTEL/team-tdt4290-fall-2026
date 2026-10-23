import type { Agent } from '@/lib/types';

/** Where an agent is for the counsellor: still a draft, private, or published to The Candidate. */
export type AgentStatus = 'draft' | 'private' | 'published';

export const AGENT_STATUS_LABEL: Record<AgentStatus, string> = {
  draft: 'Utkast',
  private: 'Privat',
  published: 'Publisert',
};

/**
 * An agent that exists is private to the counsellor. Drafts and publishing to The Candidate are
 * not stored yet, so nothing is an utkast or publisert.
 */
export function agentStatus(_agent: Agent): AgentStatus {
  return 'private';
}
