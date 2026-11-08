// The interviewer's answers, and their labels in the prompt and on the details page.
// The interviewer's fields in agentTypes/interviewer.ts use these labels.
export const LABELS = {
  stilling: 'Stilling',
  bransje: 'Bransje',
  bedrift: 'Bedrift',
  intervjutype: 'Intervjutype',
  intervjuer: 'Intervjuer',
  jobbsoker: 'Jobbsøker',
  vanskelighetsgrad: 'Vanskelighetsgrad',
  egneSporsmal: 'Egne spørsmål',
  tillegg: 'Tillegg',
  lovverk: 'Lovverk',
} as const;

/** What the counsellor has decided about the interviewer. */
export type Configuration = Record<keyof typeof LABELS, string>;
