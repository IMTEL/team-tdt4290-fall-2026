import type { Agent } from '@/lib/types';
import { getAgentType, listAgentTypes } from './agentTypes/registry';
import { readStoredAnswers } from './agentTypes/storedAnswers';
import { difficultyLevel } from './difficulty';

/** One section of the agent list: the agents of one type, or the ones we cannot read. */
export type AgentSection = { key: string; title: string; agents: Agent[] };

/** The section for agents whose type we do not know. Always the last one. */
// English translation: Other agents
export const OTHER_SECTION = { key: 'other', title: 'Andre agenter' };

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
 * The answers a search looks in: those the summary on the details page is built from, plus the
 * company and the interviewer. Long free texts (own questions, additions, legal text) are left
 * out, as their common words would find many agents.
 */
const SEARCH_FIELDS = ['stilling', 'bransje', 'bedrift', 'intervjutype', 'intervjuer', 'jobbsoker'];

/** One agent and the text a search looks in. Built once per list, not once per keystroke. */
export type SearchableAgent = { agent: Agent; text: string };

/**
 * The agents with the text a search looks in: the name, the interviewer template and the
 * agent's own answers. Not the summary sentences or the system prompt: their fixed words (such
 * as "stillingen" or "intervju") are in every agent, so a search in them would find them all.
 */
export function toSearchableAgents(agents: Agent[]): SearchableAgent[] {
  return agents.map((agent) => ({ agent, text: agentSearchText(agent) }));
}

function agentSearchText(agent: Agent): string {
  const answers = readStoredAnswers(agent.description)?.answers ?? {};
  const parts = [
    agent.name,
    agent.intervjuerMal,
    ...SEARCH_FIELDS.map((key) => answers[key]),
    // Only the level: the rest of that answer has the same labels in every agent.
    difficultyLevel(answers.vanskelighetsgrad),
  ];
  return normalize(
    parts
      .map((part) => part?.trim() ?? '')
      .filter((part) => part !== '')
      .join(' '),
  );
}

/** The words of a search. None for an empty search or one with only spaces. */
export function searchWords(query: string): string[] {
  return normalize(query).split(/\s+/).filter(Boolean);
}

/**
 * The agents that have every word in them, in any case and as part of a longer word ("butikk"
 * finds "Butikkmedarbeider"). No words keeps all agents.
 */
export function searchAgents(agents: SearchableAgent[], words: string[]): Agent[] {
  return agents
    .filter(({ text }) => words.every((word) => text.includes(word)))
    .map(({ agent }) => agent);
}

/**
 * Lower case, with one form for letters such as å (typed or pasted), and a plain hyphen for any
 * dash, so "18-24" finds "18–24".
 */
function normalize(text: string): string {
  return text
    .normalize('NFC')
    .toLocaleLowerCase('nb')
    .replace(/[\u2010-\u2015\u2212]/g, '-');
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
