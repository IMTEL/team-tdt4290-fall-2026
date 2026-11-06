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
  perAgent: 20,
} as const;

/** Where a built-in law comes from. The counsellor's own templates have none. */
export type LegalJurisdiction = 'NO' | 'EU';

export const LEGAL_JURISDICTION_LABELS: Record<LegalJurisdiction, string> = {
  NO: 'Norge',
  EU: 'EU',
};

export type LegalTemplate = {
  id: string;
  /** The law and paragraph, such as «Likestillings- og diskrimineringsloven § 30». */
  title: string;
  /** One line for the counsellor about what it covers. Shown on the card. */
  description: string;
  /** What the interviewer must follow, in plain words. Goes into the interviewer's prompt. */
  text: string;
  /** True for the templates that come with the app. They can't be changed or deleted. */
  builtIn: boolean;
  /** Norge or EU. Only the built-in templates have this. */
  jurisdiction?: LegalJurisdiction;
  /** The official text. Opens in a new tab. Only when we know the source. */
  sourceUrl?: string;
  /** Built-in paragraphs this own template was made from. Missing on free-text templates. */
  sourceIds?: string[];
  /** Shown in the picker but cannot be ticked. */
  placeholder?: boolean;
};

export type NewLegalTemplate = Pick<LegalTemplate, 'title' | 'description' | 'text' | 'sourceIds'>;

export type LegalTemplateGroup = {
  id: LegalJurisdiction | 'own';
  label: string;
  templates: LegalTemplate[];
};

/**
 * Norge, then EU, then the counsellor's own. Empty groups are left out, so a page with only
 * built-in templates has no «Eget lovverk».
 */
export function groupLegalTemplates(templates: LegalTemplate[]): LegalTemplateGroup[] {
  const groups: LegalTemplateGroup[] = [
    { id: 'NO', label: LEGAL_JURISDICTION_LABELS.NO, templates: [] },
    { id: 'EU', label: LEGAL_JURISDICTION_LABELS.EU, templates: [] },
    { id: 'own', label: 'Eget lovverk', templates: [] },
  ];
  for (const template of templates) {
    const id = template.jurisdiction ?? 'own';
    groups.find((group) => group.id === id)?.templates.push(template);
  }
  return groups.filter((group) => group.templates.length > 0);
}

/**
 * The chosen templates as one answer for the Lovverk field: each title, then its text. The
 * interviewer's prompt puts it under its own heading.
 */
export function describeLegalFrameworks(templates: NewLegalTemplate[]): string {
  return templates.map(({ title, text }) => `${title}:\n${text}`).join('\n\n');
}

/** The interviewer text from ticked paragraphs, then any extra rule the counsellor wrote. */
export function composeLegalTemplateText(paragraphs: NewLegalTemplate[], extra: string): string {
  return [describeLegalFrameworks(paragraphs), extra.trim()].filter(Boolean).join('\n\n');
}
