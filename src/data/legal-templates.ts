import {
  describeLegalFrameworks,
  type LegalJurisdiction,
  type LegalTemplate,
} from '@/domain/legalTemplate';

/** The bundled standard template, and the old id for it in saved drafts. */
export const STANDARD_LEGAL_TEMPLATE_ID = 'builtin-legal-hiring-rights';

function law(
  id: string,
  jurisdiction: LegalJurisdiction,
  title: string,
  description: string,
  text: string,
  sourceUrl: string,
): LegalTemplate {
  return { id, builtIn: true, jurisdiction, title, description, text, sourceUrl };
}

// The paragraphs the counsellor ticks when they make their own legal template. A summary in
// plain words, not legal advice. TODO: have the customer check the wording against the laws.
export const builtInLegalParagraphs: LegalTemplate[] = [
  law(
    'builtin-legal-ldl-30',
    'NO',
    'Likestillings- og diskrimineringsloven § 30',
    'Hva arbeidsgiveren ikke kan spørre om i et jobbintervju.',
    'Arbeidsgiveren kan ikke spørre om graviditet, adopsjon, planer om å få barn, religion eller ' +
      'livssyn, etnisitet, funksjonsnedsettelse, seksuell orientering, kjønnsidentitet eller ' +
      'kjønnsuttrykk. Unntakene er få, for eksempel livssyn i en stilling i et trossamfunn. ' +
      'Jobbsøkeren har rett til å la være å svare på slike spørsmål, uten at det skal telle mot hen.',
    'https://lovdata.no/lov/2017-06-16-51/%C2%A730',
  ),
  law(
    'builtin-legal-aml-9-3',
    'NO',
    'Arbeidsmiljøloven § 9-3',
    'Helseopplysninger ved ansettelse.',
    'Arbeidsgiveren kan ikke be om helseopplysninger, utover det som trengs for å gjøre de ' +
      'oppgavene som hører til stillingen.',
    'https://lovdata.no/lov/2005-06-17-62/%C2%A79-3',
  ),
  law(
    'builtin-legal-aml-13-1',
    'NO',
    'Arbeidsmiljøloven § 13-1',
    'Forbud mot diskriminering i arbeidslivet.',
    'Arbeidsgiveren kan ikke legge vekt på alder, politisk syn eller medlemskap i fagforening ' +
      'når hen ansetter.',
    'https://lovdata.no/lov/2005-06-17-62/%C2%A713-1',
  ),
  law(
    'builtin-legal-aml-13-4',
    'NO',
    'Arbeidsmiljøloven § 13-4',
    'Forbud mot å innhente visse opplysninger ved ansettelse.',
    'Arbeidsgiveren kan ikke spørre om politisk syn eller fagforening, og kan ikke iverksette ' +
      'tiltak for å skaffe slike opplysninger.',
    'https://lovdata.no/lov/2005-06-17-62/%C2%A713-4',
  ),
];

function placeholder(id: string, jurisdiction: LegalJurisdiction, title: string): LegalTemplate {
  return { id, builtIn: true, jurisdiction, title, description: '', text: '', placeholder: true };
}

/** EU examples in the picker. Visible, but they cannot be ticked. */
export const legalParagraphPlaceholders: LegalTemplate[] = [
  placeholder('placeholder-eu-1', 'EU', 'EU lov 1'),
  placeholder('placeholder-eu-2', 'EU', 'EU lov 2'),
  placeholder('placeholder-eu-3', 'EU', 'EU lov 3'),
];

/** The standard template: every built-in paragraph, all selected. */
export const standardLegalTemplate: LegalTemplate = {
  id: STANDARD_LEGAL_TEMPLATE_ID,
  builtIn: true,
  title: 'Rettigheter i ansettelsesprosessen',
  description: 'Hva en arbeidsgiver ikke kan spørre om i et jobbintervju, etter norsk rett.',
  text: describeLegalFrameworks(builtInLegalParagraphs),
};

/** What the counsellor ticks on /configure: the standard template, then their own. */
export const builtInLegalTemplates: LegalTemplate[] = [standardLegalTemplate];

/** A new interviewer starts with the standard template, which has every paragraph. */
export function builtInLegalTemplateIds(): string[] {
  return [STANDARD_LEGAL_TEMPLATE_ID];
}

const paragraphIds = new Set([
  ...builtInLegalParagraphs.map((paragraph) => paragraph.id),
  // Drafts from when the EU placeholders were ticked still count as the standard template.
  'builtin-legal-gdpr-9',
  'builtin-legal-dir-2000-78',
  'builtin-legal-dir-2006-54',
]);

/**
 * Drafts from when each paragraph was ticked on /configure are read as the standard template.
 * Own template ids are kept.
 */
export function normalizeLegalTemplateIds(ids: string[]): string[] {
  const own = ids.filter((id) => id !== STANDARD_LEGAL_TEMPLATE_ID && !paragraphIds.has(id));
  const hasStandard = ids.some((id) => id === STANDARD_LEGAL_TEMPLATE_ID || paragraphIds.has(id));
  return hasStandard ? [STANDARD_LEGAL_TEMPLATE_ID, ...own] : own;
}

/** The built-in paragraph with this id, or undefined if there is none. */
export function findBuiltInLegalParagraph(id: string): LegalTemplate | undefined {
  return builtInLegalParagraphs.find((paragraph) => paragraph.id === id);
}

/** The standard template, a paragraph, or undefined. */
export function findBuiltInLegalTemplate(id: string): LegalTemplate | undefined {
  if (id === STANDARD_LEGAL_TEMPLATE_ID) return standardLegalTemplate;
  return findBuiltInLegalParagraph(id);
}

/**
 * The paragraphs a template stands for: every built-in one for the standard template, or the
 * ones the counsellor ticked when they made their own.
 */
export function paragraphsForTemplate(template: LegalTemplate): LegalTemplate[] {
  if (template.id === STANDARD_LEGAL_TEMPLATE_ID) return builtInLegalParagraphs;
  if (!template.sourceIds?.length) return [];
  return template.sourceIds.flatMap((id) => {
    const paragraph = findBuiltInLegalParagraph(id);
    return paragraph ? [paragraph] : [];
  });
}

/** Which built-in paragraphs a saved text still names, so the form can tick them again. */
export function inferSourceIds(text: string): string[] {
  return builtInLegalParagraphs
    .filter((paragraph) => text.includes(`${paragraph.title}:`))
    .map((paragraph) => paragraph.id);
}
