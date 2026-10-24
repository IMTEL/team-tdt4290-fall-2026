import type { Agent } from '@/lib/types';
import { getAgentType, listAgentTypes } from './agentTypes/registry';
import { readStoredAnswers } from './agentTypes/storedAnswers';
import { difficultyLevel } from './difficulty';

/** One section of the agent list: the agents of one type, or the ones we cannot read. */
export type AgentSection = { key: string; title: string; agents: Agent[] };

/** The section for agents whose type we do not know. Always the last one. */
// English translation: Other agents
const OTHER_SECTION = { key: 'other', title: 'Andre agenter' };

/**
 * A short line about the agent for its card, e.g. "Butikkmedarbeider · Lett", or "" if there is
 * nothing to show. The longer summary in sentences is on the details page (`buildSummary`).
 */
export function agentSummary(agent: Agent): string {
  // An industry template stores the whole job description after the title ("Kokk. Kokk på …").
  // The card only needs the title. The full text is on the agent's page.
  const title = agent.stilling?.split('. ')[0];
  const parts = [title, difficultyLevel(agent.vanskelighetsgrad)];
  return parts
    .map((part) => part?.trim() ?? '')
    .filter((part) => part !== '')
    .join(' · ');
}

/** The agent's role for its card: the name of its agent type, or "" if it is not ours. */
export function agentRole(agent: Agent): string {
  return agent.typeLabel ?? '';
}

/**
 * The interviewer line on a card, e.g. "Butikksjef, vennlig". A template stores a whole persona
 * in that answer, so the card uses the template's name instead, e.g. "Daglig leder".
 */
export function agentInterviewer(agent: Agent): string {
  const text = agent.intervjuer?.trim() ?? '';
  if (text && isShortRole(text)) return capitalize(text);
  return agent.intervjuerMal?.trim() ?? '';
}

/** The interview type as one sentence, e.g. "Første intervju.", or "" if it is missing. */
export function agentCardDetail(agent: Agent): string {
  return sentence(capitalize(agent.intervjutype));
}

/** A role line is short and has no sentence in it, e.g. "Rektor, vennlig". */
function isShortRole(text: string): boolean {
  return text.length <= 48 && !text.includes('.');
}

/** The text as one sentence, or "" if it is empty. */
function sentence(text: string): string {
  if (!text) return '';
  return text.endsWith('.') ? text : `${text}.`;
}

/** The text with its first letter in upper case, or "" if it is empty. */
function capitalize(text: string | null | undefined): string {
  const trimmed = text?.trim() ?? '';
  if (!trimmed) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/**
 * All the text a search looks in, in lower case: the name, what the card shows and the summary of
 * the configuration. Not the system prompt: every agent shares its rules and words such as
 * "intervju", so a search in it would find almost every agent.
 */
export function agentSearchText(agent: Agent): string {
  const stored = readStoredAnswers(agent.description);
  const parts = [
    agent.name,
    agent.typeLabel,
    agent.stilling,
    agent.bransje,
    difficultyLevel(agent.vanskelighetsgrad),
    agent.intervjuer,
    agent.intervjuerMal,
    agent.intervjutype,
    stored ? stored.definition.buildSummary(stored.answers) : '',
  ];
  return parts
    .map((part) => part?.trim() ?? '')
    .filter((part) => part !== '')
    .join(' ')
    .toLocaleLowerCase('nb');
}

/**
 * The agents that have every word of the search in them, in any case and as part of a longer
 * word ("butikk" finds "Butikkmedarbeider"). An empty search keeps all agents.
 */
export function searchAgents(agents: Agent[], query: string): Agent[] {
  const words = query.toLocaleLowerCase('nb').split(/\s+/).filter(Boolean);
  if (words.length === 0) return agents;
  return agents.filter((agent) => {
    const text = agentSearchText(agent);
    return words.every((word) => text.includes(word));
  });
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
 * Newest first. Compares the times, not the text: agents made in RAGdoll may write the time in
 * another format than ours. Agents without a readable time go last.
 */
function newestFirst(agents: Agent[]): Agent[] {
  return [...agents].sort((a, b) => time(b) - time(a));
}

function time(agent: Agent): number {
  const ms = Date.parse(agent.lastUpdated);
  return Number.isNaN(ms) ? -Infinity : ms;
}
