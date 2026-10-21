// What a counsellor writes when publishing an agent to The Candidate. RAGdoll has the same limits.

/** The longest short description The Candidate shows. */
export const MAX_PUBLIC_DESCRIPTION_LENGTH = 300;

/** The description without spaces at the ends, or null if it is too long or not text. May be empty. */
export function cleanPublicDescription(value: unknown): string | null {
  if (value === undefined) return '';
  if (typeof value !== 'string') return null;
  const description = value.trim();
  return description.length <= MAX_PUBLIC_DESCRIPTION_LENGTH ? description : null;
}
