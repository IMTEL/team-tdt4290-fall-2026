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
