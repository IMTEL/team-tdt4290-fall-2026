/** One-shot message shown on the templates page after creating or saving a mal. */
const FLASH_KEY = 'kfi-templates-flash';

export const TEMPLATE_CREATED_FLASH = 'mal-laget';
export const TEMPLATE_SAVED_FLASH = 'mal-lagret';

export function setTemplatesFlash(message: string) {
  try {
    sessionStorage.setItem(FLASH_KEY, message);
  } catch {
    // Private mode or full storage — skip the toast; the redirect still happens.
  }
}

/** Reads and clears a flash message, or null if there is none. */
export function takeTemplatesFlash(): string | null {
  try {
    const message = sessionStorage.getItem(FLASH_KEY);
    if (message) sessionStorage.removeItem(FLASH_KEY);
    return message;
  } catch {
    return null;
  }
}
