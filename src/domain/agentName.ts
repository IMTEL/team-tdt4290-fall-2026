/** The longest name a counsellor can give an agent. RAGdoll's public_name has the same limit. */
export const MAX_NAME_LENGTH = 80;

/** The name without spaces at the ends, or null if it is empty, too long or not text. */
export function cleanName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const name = value.trim();
  return name && name.length <= MAX_NAME_LENGTH ? name : null;
}

const CLONE_SUFFIX = ' (kopi)';

/** The suggested name for a copy of an agent. */
export function cloneName(name: string): string {
  const base = name
    .trim()
    .slice(0, MAX_NAME_LENGTH - CLONE_SUFFIX.length)
    .trimEnd();
  return base + CLONE_SUFFIX;
}
