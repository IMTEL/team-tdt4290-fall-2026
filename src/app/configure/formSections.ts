// The sections of the new interviewer form, in order, each with the anchor of its part on the help
// page. A plain module, not 'use client', so the server-rendered help page can import it too.

export type FormSection = {
  readonly title: string;
  readonly helpId: string;
  /** Skipped steps stay past but not done until the counsellor opens them. */
  readonly optional?: boolean;
};

export const FORM_SECTIONS = [
  // English translation: Position and workplace
  { title: 'Stilling og arbeidsplass', helpId: 'stilling' },
  // English translation: Interviewer
  { title: 'Intervjuer', helpId: 'intervjuer' },
  // English translation: Job seeker
  { title: 'Jobbsøker', helpId: 'jobbsoker' },
  // English translation: Settings
  { title: 'Innstillinger', helpId: 'innstillinger' },
  // English translation: AI settings. Optional: dashed mark and «Valgfritt», not nested.
  { title: 'AI-innstillinger', helpId: 'ai-innstillinger', optional: true },
  // English translation: Finish
  { title: 'Fullføre', helpId: 'fullfore' },
] as const satisfies readonly FormSection[];

export type FormSectionHelpId = (typeof FORM_SECTIONS)[number]['helpId'];

/** The help page's topic about the whole form, for a section that has no part of its own. */
export const NEW_AGENT_HELP_ID = 'lag-en-agent';

/** Where the help for section `index` of the form is. */
export function formSectionHelpHref(index: number): string {
  return `/help#${FORM_SECTIONS[index]?.helpId ?? NEW_AGENT_HELP_ID}`;
}
