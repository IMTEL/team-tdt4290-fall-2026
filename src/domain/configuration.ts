// The fields of the KONFIGURASJON block that the configurator agent writes when it is done.
// The labels are the exact words in prompts/configurator.nb.md.
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
} as const;

/** What the counsellor has decided about the interviewer. */
export type Configuration = Record<keyof typeof LABELS, string>;

/**
 * Fields the counsellor may leave empty. Tillegg is anything extra the counsellor wanted to add
 * at the end of the questionnaire, so it is often empty.
 */
export const OPTIONAL_FIELDS: ReadonlySet<keyof Configuration> = new Set(['tillegg']);

/**
 * Reads the KONFIGURASJON block out of a reply from the configurator agent.
 * `decided` holds fields the counsellor has already settled outside the chat: the interviewer from
 * a template, the job seeker from a profile. Their lines are not needed in the block, and these
 * values win over what the configurator writes. Every other line is required, except the optional
 * fields, which become empty when their line is missing.
 * Returns null if the reply has no block, or if a line is missing. AI generated.
 */
export function parseConfiguration(
  reply: string,
  decided: Partial<Configuration> = {},
): Configuration | null {
  const start = reply.indexOf('KONFIGURASJON');
  if (start === -1) return null;

  const lines = reply
    .slice(start)
    .split('\n')
    .map((line) => line.trim());

  const configuration: Partial<Configuration> = {};
  for (const [field, label] of Object.entries(LABELS) as [keyof Configuration, string][]) {
    if (decided[field]) {
      configuration[field] = decided[field];
      continue;
    }
    const line = lines.find((l) => l.startsWith(`${label}:`));
    const value = line?.slice(label.length + 1).trim() ?? '';
    if (!value && !OPTIONAL_FIELDS.has(field)) return null;
    configuration[field] = value;
  }
  return configuration as Configuration;
}

/** True if `value` has every field of a configuration as a string, only optional ones empty. */
export function isConfiguration(value: unknown): value is Configuration {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (Object.keys(LABELS) as (keyof Configuration)[]).every(
    (field) =>
      typeof record[field] === 'string' && (record[field] !== '' || OPTIONAL_FIELDS.has(field)),
  );
}
