/** The longest name a counsellor can give an agent. */
export const MAX_NAME_LENGTH = 100;

/** The name without spaces at the ends, or null if it is empty, too long or not text. */
export function cleanName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const name = value.trim();
  return name && name.length <= MAX_NAME_LENGTH ? name : null;
}
