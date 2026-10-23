// Legal templates. A counsellor writes down a law or rule about hiring once, such as what an
// employer may not ask about in a job interview, and chooses it on /configure. The interviewer
// then follows it, and can tell the job seeker about their rights if asked. Built in, or saved by
// a counsellor in RAGdoll's templates with their own type.

/** RAGdoll's template type for legal templates. Kept apart from the agent types' templates. */
export const LEGAL_TEMPLATE_TYPE = 'legal-framework';

/** The longest each field may be, and how many templates one interviewer may follow. */
export const LEGAL_TEMPLATE_LIMITS = {
  title: 100,
  description: 300,
  text: 4000,
  perAgent: 5,
} as const;

export type LegalTemplate = {
  id: string;
  /** The law or rule, such as «Likestillings- og diskrimineringsloven § 30». */
  title: string;
  /** One line for the counsellor about what it covers. Shown on the card. */
  description: string;
  /** What the interviewer must follow, in plain words. Goes into the interviewer's prompt. */
  text: string;
  /** True for the templates that come with the app. They can't be changed or deleted. */
  builtIn: boolean;
};

export type NewLegalTemplate = Pick<LegalTemplate, 'title' | 'description' | 'text'>;

/**
 * The chosen templates as one answer for the Lovverk field: each title, then its text. The
 * interviewer's prompt puts it under its own heading.
 */
export function describeLegalFrameworks(templates: NewLegalTemplate[]): string {
  return templates.map(({ title, text }) => `${title}:\n${text}`).join('\n\n');
}
