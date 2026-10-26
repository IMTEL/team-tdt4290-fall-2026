/** One-shot message shown on the agents page after a redirect (e.g. after saving). */
const FLASH_KEY = 'kfi-agents-flash';

export const AGENT_SAVED_FLASH = 'agent-lagret';
export const DRAFT_SAVED_FLASH = 'utkast-lagret';

export function setAgentsFlash(message: string) {
  try {
    sessionStorage.setItem(FLASH_KEY, message);
  } catch {
    // Private mode or full storage — skip the toast; the redirect still happens.
  }
}

/** One-shot note for an agent's page: it was hidden from The Candidate because it was edited. */
const HIDDEN_KEY = 'kfi-agent-hidden';

export function setAgentHiddenFlash(agentId: string) {
  try {
    sessionStorage.setItem(HIDDEN_KEY, agentId);
  } catch {
    // Private mode or full storage — skip the note; the agent is hidden all the same.
  }
}

/** True once, on the page of the agent that was just hidden, and clears the note. */
export function takeAgentHiddenFlash(agentId: string): boolean {
  try {
    if (sessionStorage.getItem(HIDDEN_KEY) !== agentId) return false;
    sessionStorage.removeItem(HIDDEN_KEY);
    return true;
  } catch {
    return false;
  }
}

/** Reads and clears a flash message, or null if there is none. */
export function takeAgentsFlash(): string | null {
  try {
    const message = sessionStorage.getItem(FLASH_KEY);
    if (message) sessionStorage.removeItem(FLASH_KEY);
    return message;
  } catch {
    return null;
  }
}
