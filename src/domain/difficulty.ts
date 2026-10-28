/**
 * The level of a difficulty answer, alone and capitalised. The configuration chat may add more
 * after it, as in "lett | Antall spørsmål: 6 | Oppfølgingsspørsmål: ja".
 */
export function difficultyLevel(answer: string | null | undefined): string {
  const level = answer?.split('|')[0].trim() ?? '';
  return level.charAt(0).toUpperCase() + level.slice(1);
}

/** The number of questions in a difficulty answer, such as «5–6», or "" if it has none. */
export function questionCountOf(answer: string | null | undefined): string {
  return answer?.match(/Antall spørsmål:\s*([^|]+)/i)?.[1].trim() ?? '';
}

/** Whether a difficulty answer says yes or no to follow-up questions, or null if it says neither. */
export function followUpOf(answer: string | null | undefined): 'ja' | 'nei' | null {
  const value = answer?.match(/Oppfølgingsspørsmål:\s*(ja|nei)\b/i)?.[1].toLowerCase();
  return value === 'ja' || value === 'nei' ? value : null;
}
