// The options block the configurator agent writes at the end of a question.
// The format is described in prompts/configurator.nb.md:
//
//   [ALTERNATIVER: ett]     (or "flere" when several answers are allowed)
//   1. Offentlig
//   2. Privat
//
// A question the counsellor may skip has a [VALGFRITT] line, with or without options.
const MARKER = /^\[ALTERNATIVER:\s*(ett|flere)\s*\]$/i;
const CHOICE = /^(\d+)[.)]\s+(.+)$/;
const OPTIONAL = /^\[VALGFRITT\]$/i;

/** The chat message sent when the counsellor skips an optional question. */
export const SKIP_ANSWER = 'Hopp over';

/** One answer the counsellor can click, with the number the agent gave it. */
export type Choice = { number: number; label: string };

/**
 * The answers offered for a question, whether the counsellor may pick more than one, and whether
 * the question may be skipped. `choices` is empty for an optional question without options.
 */
export type QuestionOptions = { multiple: boolean; choices: Choice[]; skippable: boolean };

/** A reply split into the text to show and the options to render as buttons or checkboxes. */
export type ParsedReply = { text: string; options: QuestionOptions | null };

/**
 * Splits a reply from the configurator agent into its text and its options block.
 * Lines after the marker that are not numbered options stay in the text.
 * Returns the text without the [VALGFRITT] line, and no options, if there is no numbered option
 * and the question is not optional. AI generated.
 */
export function parseQuestionOptions(reply: string): ParsedReply {
  const all = reply.split('\n');
  const lines = all.filter((line) => !OPTIONAL.test(line.trim()));
  const skippable = lines.length < all.length;

  const markerIndex = lines.findLastIndex((line) => MARKER.test(line.trim()));
  const choices: Choice[] = [];
  const rest: string[] = [];
  for (const line of markerIndex === -1 ? [] : lines.slice(markerIndex + 1)) {
    const match = CHOICE.exec(line.trim());
    if (match) choices.push({ number: Number(match[1]), label: match[2].trim() });
    else rest.push(line);
  }

  // Without numbered options, a marker with nothing after it is just text.
  if (choices.length === 0) {
    const options = skippable ? { multiple: false, choices, skippable } : null;
    return { text: asText(lines), options };
  }

  const multiple = MARKER.exec(lines[markerIndex].trim())?.[1].toLowerCase() === 'flere';
  const text = asText([...lines.slice(0, markerIndex), ...rest]);
  return { text, options: { multiple, choices, skippable } };
}

/** Joins lines back into a message, with at most one empty line in a row. */
function asText(lines: string[]): string {
  return lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * The chat message that answers a question: the chosen options with their numbers, so the agent
 * knows exactly which ones were picked, followed by the counsellor's own words, if any.
 * For example "1. HR, 3. Kollega. Annet: vil ha en rolig intervjuer".
 */
export function formatAnswer(chosen: Choice[], otherText = ''): string {
  const picked = chosen.map((choice) => `${choice.number}. ${choice.label}`).join(', ');
  const other = otherText.trim();

  if (!picked) return other;
  if (!other) return picked;
  return `${picked}. Annet: ${other}`;
}
