/**
 * The level of a difficulty answer, alone and capitalised. The configuration chat may add more
 * after it, as in "lett | Antall spørsmål: 6 | Oppfølgingsspørsmål: ja".
 */
export function difficultyLevel(answer: string | null | undefined): string {
  const level = answer?.split('|')[0].trim() ?? '';
  return level.charAt(0).toUpperCase() + level.slice(1);
}
