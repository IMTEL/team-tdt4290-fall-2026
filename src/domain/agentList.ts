import type { Agent } from '@/lib/types';
import { getAgentType, listAgentTypes } from './agentTypes/registry';

/** One section of the agent list: the agents of one type, or the ones we cannot read. */
export type AgentSection = { key: string; title: string; agents: Agent[] };

/** The section for agents whose type we do not know. Always the last one. */
const OTHER_SECTION = { key: 'other', title: 'Andre agenter' };

/**
 * A short line about the agent for its card, e.g. "Butikkmedarbeider · Lett", or "" if there is
 * nothing to show. Placeholder until #60 gives agents a real summary.
 */
export function agentSummary(agent: Agent): string {
  const parts = [agent.stilling, difficultyLevel(agent.vanskelighetsgrad)];
  return parts
    .map((part) => part?.trim() ?? '')
    .filter((part) => part !== '')
    .join(' · ');
}

/** The agent's role for its card. Placeholder until #56: for now the name of its agent type. */
export function agentRole(agent: Agent): string {
  return agent.typeLabel ?? '';
}

/**
 * The agents in one section per agent type, in the order of the registry, with the agents we
 * cannot read last. Empty sections are left out. Each section has the newest agents first.
 */
export function groupAgentsByType(agents: Agent[]): AgentSection[] {
  const sections: AgentSection[] = listAgentTypes().map((definition) => ({
    key: definition.id,
    title: definition.label,
    agents: agents.filter((agent) => agent.type === definition.id),
  }));
  sections.push({
    ...OTHER_SECTION,
    agents: agents.filter((agent) => !agent.type || !getAgentType(agent.type)),
  });

  return sections
    .filter((section) => section.agents.length > 0)
    .map((section) => ({ ...section, agents: newestFirst(section.agents) }));
}

/**
 * The level alone, capitalised. The configuration chat may add more after it, as in
 * "lett | Antall spørsmål: 6 | Oppfølgingsspørsmål: ja".
 */
function difficultyLevel(answer: string | null | undefined): string {
  const level = answer?.split('|')[0].trim() ?? '';
  return level.charAt(0).toUpperCase() + level.slice(1);
}

/** Newest first. `lastUpdated` is an ISO timestamp, so comparing the text sorts by time. */
function newestFirst(agents: Agent[]): Agent[] {
  return [...agents].sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated));
}
