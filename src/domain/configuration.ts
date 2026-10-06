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
 * Returns null if the reply has no block, or if a line is missing. AI generated.
 */
export function parseConfiguration(reply: string): Configuration | null {
  const start = reply.indexOf('KONFIGURASJON');
  if (start === -1) return null;

  const lines = reply
    .slice(start)
    .split('\n')
    .map((line) => line.trim());

  const configuration: Partial<Configuration> = {};
  for (const [field, label] of Object.entries(LABELS) as [keyof Configuration, string][]) {
    const line = lines.find((l) => l.startsWith(`${label}:`));
    const value = line?.slice(label.length + 1).trim();
    if (!value) return null;
    configuration[field] = value;
  }
  return configuration as Configuration;
}

/** The configuration as labelled rows, in the same order as the KONFIGURASJON block. */
export function configurationFields(
  configuration: Configuration,
): { label: string; value: string }[] {
  return (Object.keys(LABELS) as (keyof Configuration)[]).map((field) => ({
    label: LABELS[field],
    value: configuration[field],
  }));
}

/**
 * Reads the configuration stored in an agent's description. Saving writes it as JSON.
 * Returns null when the description is not that JSON.
 */
export function readStoredConfiguration(description: string): Configuration | null {
  try {
    const parsed: unknown = JSON.parse(description);
    return isConfiguration(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** True if `value` has every field of a configuration, each a non-empty string. */
export function isConfiguration(value: unknown): value is Configuration {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return Object.keys(LABELS).every(
    (field) => typeof record[field] === 'string' && record[field] !== '',
  );
}
