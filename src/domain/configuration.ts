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
} as const;

/** What the counsellor has decided about the interviewer. */
export type Configuration = Record<keyof typeof LABELS, string>;

/**
 * Reads the KONFIGURASJON block out of a reply from the configurator agent.
 * With a template, the template decides the interviewer: the caller passes it in as `interviewer`,
 * and the block needs no Intervjuer line. Without one, the Intervjuer line is required.
 * Returns null if the reply has no block, or if a line is missing. AI generated.
 */
export function parseConfiguration(reply: string, interviewer?: string): Configuration | null {
  const start = reply.indexOf('KONFIGURASJON');
  if (start === -1) return null;

  const lines = reply
    .slice(start)
    .split('\n')
    .map((line) => line.trim());

  const configuration: Partial<Configuration> = { intervjuer: interviewer };
  for (const [field, label] of Object.entries(LABELS) as [keyof Configuration, string][]) {
    if (field === 'intervjuer' && interviewer) continue;
    const line = lines.find((l) => l.startsWith(`${label}:`));
    const value = line?.slice(label.length + 1).trim();
    if (!value) return null;
    configuration[field] = value;
  }
  return configuration as Configuration;
}

/** True if `value` has every field of a configuration, each a non-empty string. */
export function isConfiguration(value: unknown): value is Configuration {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return Object.keys(LABELS).every(
    (field) => typeof record[field] === 'string' && record[field] !== '',
  );
}
