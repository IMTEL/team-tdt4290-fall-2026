import { setFlash, takeFlash } from '@/lib/flash';

/** One-shot message shown on the templates page after creating or saving a mal. */
const FLASH_KEY = 'kfi-templates-flash';

export const TEMPLATE_CREATED_FLASH = 'mal-laget';
export const TEMPLATE_SAVED_FLASH = 'mal-lagret';
export const PROFILE_CREATED_FLASH = 'jobbsokermal-laget';
export const PROFILE_SAVED_FLASH = 'jobbsokermal-lagret';

export function setTemplatesFlash(message: string) {
  setFlash(FLASH_KEY, message);
}

/** Reads and clears a flash message, or null if there is none. */
export function takeTemplatesFlash(): string | null {
  return takeFlash(FLASH_KEY);
}
