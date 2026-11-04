import { SECTOR_LABELS, type Sector } from '@/data/industry-templates';
import type { Agent } from '@/lib/types';
import { OTHER_SECTION } from './agentList';
import { getAgentType } from './agentTypes/registry';
import { difficultyLevel } from './difficulty';

/** What the counsellor has chosen in each filter on Browse Agents. '' means «Alle». */
export type AgentFilters = {
  role: string;
  industry: string;
  sector: string;
  interviewType: string;
  difficulty: string;
};

export type AgentFilterKey = keyof AgentFilters;

/** No filter chosen: every agent is shown. */
export const EMPTY_FILTERS: AgentFilters = {
  role: '',
  industry: '',
  sector: '',
  interviewType: '',
  difficulty: '',
};

/** One choice in a filter. `value` is what the agent is compared with, `label` what is shown. */
export type FilterOption = { value: string; label: string };

/** The choices in each filter, taken from the agents in the list. */
export type AgentFilterOptions = Record<AgentFilterKey, FilterOption[]>;

/** The difficulties the wizard offers, easiest first. Others found in agents go after them. */
const DIFFICULTY_ORDER = ['lett', 'middels', 'krevende'];

/** True if at least one filter is chosen. */
export function hasActiveFilters(filters: AgentFilters): boolean {
  return Object.values(filters).some((value) => value !== '');
}

/**
 * The industry and the sector in a Bransje answer, such as «Varehandel (privat) | Om bransjen: …».
 * Each is "" when it is missing or not given («Ingen bransje», «ikke oppgitt»).
 */
export function parseBransje(answer: string | null | undefined): {
  industry: string;
  sector: Sector | '';
} {
  const line = answer?.split('|')[0].trim() ?? '';
  const match = line.match(/^(.*?)\s*\(([^)]*)\)$/);
  const industry = (match ? match[1] : line).trim();
  const sector = match?.[2].trim().toLocaleLowerCase('nb') ?? '';
  return {
    industry: industry.toLocaleLowerCase('nb') === 'ingen bransje' ? '' : industry,
    sector: sector === 'offentlig' || sector === 'privat' ? sector : '',
  };
}

/**
 * One choice per filter for one agent, or null where the agent has no answer. The value is in
 * lower case, so «Varehandel» and «varehandel» are the same choice.
 */
function agentChoices(agent: Agent): Record<AgentFilterKey, FilterOption | null> {
  const definition = agent.type ? getAgentType(agent.type) : undefined;
  const { industry, sector } = parseBransje(agent.bransje);
  return {
    // Agents of a type we do not know are one choice, as they are one section on the page.
    role: definition
      ? { value: definition.id, label: definition.label }
      : { value: OTHER_SECTION.key, label: OTHER_SECTION.title },
    industry: choice(industry),
    sector: sector ? { value: sector, label: SECTOR_LABELS[sector] } : null,
    interviewType: choice(agent.intervjutype),
    difficulty: choice(difficultyLevel(agent.vanskelighetsgrad)),
  };
}

function choice(text: string | null | undefined): FilterOption | null {
  const trimmed = text?.trim() ?? '';
  if (!trimmed) return null;
  return {
    value: trimmed.toLocaleLowerCase('nb'),
    label: trimmed.charAt(0).toUpperCase() + trimmed.slice(1),
  };
}

/**
 * The choices in each filter: those the agents in the list have, each once. Difficulty goes from
 * easy to hard; the others are in alphabetical order.
 */
export function filterOptions(agents: Agent[]): AgentFilterOptions {
  const found: Record<AgentFilterKey, Map<string, FilterOption>> = {
    role: new Map(),
    industry: new Map(),
    sector: new Map(),
    interviewType: new Map(),
    difficulty: new Map(),
  };
  for (const agent of agents) {
    const choices = agentChoices(agent);
    for (const key of Object.keys(found) as AgentFilterKey[]) {
      const option = choices[key];
      if (option && !found[key].has(option.value)) found[key].set(option.value, option);
    }
  }

  const sorted = (key: AgentFilterKey) =>
    [...found[key].values()].sort((a, b) => a.label.localeCompare(b.label, 'nb'));
  return {
    role: sorted('role'),
    industry: sorted('industry'),
    sector: sorted('sector'),
    interviewType: sorted('interviewType'),
    difficulty: sorted('difficulty').sort((a, b) => difficultyRank(a) - difficultyRank(b)),
  };
}

function difficultyRank(option: FilterOption): number {
  const index = DIFFICULTY_ORDER.indexOf(option.value);
  return index === -1 ? DIFFICULTY_ORDER.length : index;
}

/** The agents that match every chosen filter. No filter chosen keeps all agents. */
export function filterAgents(agents: Agent[], filters: AgentFilters): Agent[] {
  if (!hasActiveFilters(filters)) return agents;
  const active = (Object.keys(filters) as AgentFilterKey[]).filter((key) => filters[key] !== '');
  return agents.filter((agent) => {
    const choices = agentChoices(agent);
    return active.every((key) => choices[key]?.value === filters[key]);
  });
}
