import { setFlash, takeFlash } from '@/lib/flash';

/** One-shot message shown on the agents page after a redirect (e.g. after saving). */
const FLASH_KEY = 'kfi-agents-flash';

export const AGENT_SAVED_FLASH = 'agent-lagret';
export const AGENT_PUBLISHED_FLASH = 'agent-publisert';
export const DRAFT_SAVED_FLASH = 'utkast-lagret';

export function setAgentsFlash(message: string) {
  setFlash(FLASH_KEY, message);
}

/** Reads and clears a flash message, or null if there is none. */
export function takeAgentsFlash(): string | null {
  return takeFlash(FLASH_KEY);
}

/** One-shot note for an agent's page: it was hidden from The Candidate because it was edited. */
const hiddenKey = (agentId: string) => `kfi-agent-hidden:${agentId}`;

export function setAgentHiddenFlash(agentId: string) {
  setFlash(hiddenKey(agentId), 'gjemt');
}

/** True once, on the page of the agent that was just hidden, and clears the note. */
export function takeAgentHiddenFlash(agentId: string): boolean {
  return takeFlash(hiddenKey(agentId)) !== null;
}
