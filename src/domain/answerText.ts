// What the configurator writes when it has nothing to say. Not worth a sentence.
const NOTHING = /^(ingen|ingen opplysninger.*|ikke oppgitt|ukjent|[-–])$/i;

/** The answer without spaces or a final full stop, or "" if it says nothing. */
export function cleanAnswer(answer: string | null | undefined): string {
  const text = (answer ?? '').trim().replace(/[.;,\s]+$/, '');
  return NOTHING.test(text) ? '' : text;
}

/**
 * The text with its first letter in lower case, as it follows other words in a sentence. Words
 * written in capitals, such as IKT, are left as they are.
 */
export function lowerFirst(text: string): string {
  return /^[A-ZÆØÅ][a-zæøå]/.test(text) ? text.charAt(0).toLowerCase() + text.slice(1) : text;
}
