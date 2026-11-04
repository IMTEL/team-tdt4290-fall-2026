import type { Agent } from '@/lib/types';

/** Where an agent is for the counsellor: still a draft, private, or published to The Candidate. */
export type AgentStatus = 'draft' | 'private' | 'published';

export const AGENT_STATUS_LABEL: Record<AgentStatus, string> = {
  draft: 'Utkast',
  private: 'Privat',
  published: 'Publisert',
};

/**
 * A saved agent is publisert when The Candidate lists it, and privat otherwise. An utkast is only
 * stored in the browser (see DraftAgentCard), so a saved agent is never one.
 */
export function agentStatus(agent: Agent): AgentStatus {
  return agent.isPublished ? 'published' : 'private';
}
