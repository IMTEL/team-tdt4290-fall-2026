import type { AgentField, AgentPresets, AgentTypeDefinition, Answers } from './types';

// The first line of the block the configurator writes when the counsellor confirms.
const BLOCK_START = 'KONFIGURASJON';

/** What the counsellor chose before the chat, by the kind of preset. */
export type ChosenPresets = Partial<Record<keyof AgentPresets, boolean>>;

/**
 * The fields a chosen template or profile fills in, in the type's field order. The configurator
 * doesn't ask about them, and they are left out of its block. A preset the type doesn't have
 * decides nothing.
 */
export function decidedFields(definition: AgentTypeDefinition, chosen: ChosenPresets): string[] {
  const presets = definition.presets ?? {};
  const decided = (Object.keys(chosen) as (keyof AgentPresets)[])
    .filter((kind) => chosen[kind])
    .flatMap((kind) => presetFields(presets, kind));
  return definition.fields.map(({ key }) => key).filter((key) => decided.includes(key));
}

/** The fields one kind of preset fills in for a type, or none if the type doesn't have it. */
export function presetFields(presets: AgentPresets, kind: keyof AgentPresets): string[] {
  if (kind === 'template') return presets.template ? [presets.template.field] : [];
  if (kind === 'industryTemplate') {
    return presets.industryTemplate
      ? [presets.industryTemplate.job, presets.industryTemplate.industry]
      : [];
  }
  return presets[kind] ? [presets[kind]] : [];
}

/** The question the chat opens with: the first field nothing has decided. */
export function firstQuestion(definition: AgentTypeDefinition, decided: string[]): string {
  return openFields(definition, decided)[0]?.question ?? '';
}

/**
 * Tells the shared configurator agent what to set up: the purpose, what templates and profiles
 * have decided already, the questions in order, the type's own rules, and the exact block to end
 * with. The configure route sends it as the first message, so the configurator's prompt in RAGdoll
 * stays the same for every agent type. `decided` holds the answers settled before the chat, with
 * their text, so the configurator can fit its questions and suggestions to them: an interviewer
 * template and an industry template together, for example.
 */
export function buildBriefing(definition: AgentTypeDefinition, decided: Answers = {}): string {
  const decidedKeys = Object.keys(decided).filter((key) => decided[key]);
  const open = openFields(definition, decidedKeys);
  const settled = definition.fields.filter(({ key }) => decidedKeys.includes(key));

  const sections = [
    'OPPSETT FRA VERKTØYET. Dette er ikke skrevet av veilederen, og skal ikke vises til veilederen.',
    `Veilederen skal sette opp ${definition.configurator.purpose}.`,
  ];
  if (settled.length > 0) {
    sections.push(
      [
        '## Allerede bestemt før samtalen',
        'Veilederen har valgt dette med maler og profiler. Ikke spør om det, men bruk det når ' +
          'du spør om resten, slik at spørsmålene, forslagene og standardvalgene dine passer ' +
          'til det som er bestemt. Hvis noe veilederen sier ikke passer med dette, spør kort ' +
          'om det.',
        ...settled.map(({ key, label }) => `- ${label}: ${decided[key]}`),
      ].join('\n'),
    );
  }
  sections.push(
    [
      '## Dette må du finne ut (i denne rekkefølgen)',
      ...open.map((field, index) => `${index + 1}. ${describeField(field)}`),
    ].join('\n'),
  );
  if (definition.configurator.rules.length > 0) {
    sections.push(
      [
        '## Egne regler for denne agenten',
        ...definition.configurator.rules.map((rule) => `- ${rule}`),
      ].join('\n'),
    );
  }
  sections.push(
    [
      '## Blokken du avslutter med',
      BLOCK_START,
      ...open.map(({ label, format }) => `${label}: ${format ?? '…'}`),
    ].join('\n'),
  );
  return sections.join('\n\n');
}

/**
 * Reads the answers out of the configurator's block: one `Label: answer` line per field of the
 * type. `decided` holds answers settled before the chat, from a template or profile. Their lines
 * are not needed, and these values win over what the configurator writes. Every other line is
 * required. Returns null if the reply has no block, or if a line is missing or empty.
 */
export function parseAnswers(
  reply: string,
  definition: AgentTypeDefinition,
  decided: Answers = {},
): Answers | null {
  const start = reply.indexOf(BLOCK_START);
  if (start === -1) return null;

  const lines = reply
    .slice(start)
    .split('\n')
    .map((line) => line.trim());

  const answers: Answers = {};
  for (const { key, label } of definition.fields) {
    if (decided[key]) {
      answers[key] = decided[key];
      continue;
    }
    const line = lines.find((l) => l.startsWith(`${label}:`));
    const value = line?.slice(label.length + 1).trim();
    if (!value) return null;
    answers[key] = value;
  }
  return answers;
}

function openFields(definition: AgentTypeDefinition, decided: string[]): AgentField[] {
  return definition.fields.filter(({ key }) => !decided.includes(key));
}

function describeField({ label, question, hint }: AgentField): string {
  return [`${label}: ${question}`, hint].filter(Boolean).join(' ');
}
