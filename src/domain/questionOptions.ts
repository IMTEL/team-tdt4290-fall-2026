// The options block the configurator agent writes at the end of a question.
// The format is described in prompts/configurator.nb.md:
//
//   [ALTERNATIVER: ett]     (or "flere" when several answers are allowed)
//   1. Offentlig
//   2. Privat
const MARKER = /^\[ALTERNATIVER:\s*(ett|flere)\s*\]$/i;
const CHOICE = /^(\d+)[.)]\s+(.+)$/;

/** One answer the counsellor can click, with the number the agent gave it. */
export type Choice = { number: number; label: string };

/** The answers offered for a question, and whether the counsellor may pick more than one. */
export type QuestionOptions = { multiple: boolean; choices: Choice[] };

/** A reply split into the text to show and the options to render as buttons or checkboxes. */
export type ParsedReply = { text: string; options: QuestionOptions | null };

/**
 * Splits a reply from the configurator agent into its text and its options block.
 * Lines after the marker that are not numbered options stay in the text.
 * Returns the whole reply as text, and no options, if there is no marker or no numbered option.
 * AI generated.
 */
export function parseQuestionOptions(reply: string): ParsedReply {
  const lines = reply.split('\n');
  const markerIndex = lines.findLastIndex((line) => MARKER.test(line.trim()));
  if (markerIndex === -1) return { text: reply.trim(), options: null };

  const choices: Choice[] = [];
  const rest: string[] = [];
  for (const line of lines.slice(markerIndex + 1)) {
    const match = CHOICE.exec(line.trim());
    if (match) choices.push({ number: Number(match[1]), label: match[2].trim() });
    else rest.push(line);
  }
  if (choices.length === 0) return { text: reply.trim(), options: null };

  const multiple = MARKER.exec(lines[markerIndex].trim())?.[1].toLowerCase() === 'flere';
  const text = [...lines.slice(0, markerIndex), ...rest]
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return { text, options: { multiple, choices } };
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
