// Feedback from the observer: a shared agent that reads a finished test chat and tells the job
// seeker what went well and what to improve, each point tied to something they actually said.

/** One turn of the conversation, as both the chat and RAGdoll have it. */
export type TranscriptMessage = { role: 'user' | 'assistant'; content: string };

/** One thing the observer noticed: the candidate's own words, what it means, and what to do. */
export type ObserverPoint = { quote: string; comment: string; tip: string };

export type ObserverFeedback =
  | { kind: 'feedback'; wentWell: ObserverPoint[]; toImprove: ObserverPoint[] }
  | { kind: 'too-short'; reason: string };

/** How many answers the candidate must give before there is anything to give feedback on. */
export const MIN_CANDIDATE_ANSWERS = 2;

/** The longest transcript the observer reads, in characters: about 10 000 tokens. */
export const MAX_TRANSCRIPT_LENGTH = 40_000;

/**
 * What the counsellor reads when the conversation is too short for feedback. The server sends it,
 * so it lives here and not in a component.
 * English translation: The conversation is too short to give feedback. Answer at least 2 questions
 * first.
 */
export const TOO_SHORT_REASON = `Samtalen er for kort til å gi tilbakemelding. Svar på minst ${MIN_CANDIDATE_ANSWERS} spørsmål først.`;

// A quote must be at least this many words. Shorter ones, like «jeg», are in almost every answer,
// so they would let an invented point through.
const MIN_QUOTE_WORDS = 3;

/** True if the candidate has answered enough times for the observer to judge. */
export function hasEnoughToJudge(messages: TranscriptMessage[]): boolean {
  return messages.filter(({ role }) => role === 'user').length >= MIN_CANDIDATE_ANSWERS;
}

/**
 * The conversation as one text, one line per turn. It is sent as a single message, so it doesn't
 * matter how RAGdoll treats the roles of the turns. Line breaks inside a turn become spaces, so an
 * answer can't start a line that looks like the interviewer's.
 */
export function formatTranscript(messages: TranscriptMessage[]): string {
  return messages
    .map(({ role, content }) => {
      const speaker = role === 'user' ? 'Kandidat' : 'Intervjuer';
      return `${speaker}: ${content.replace(/\s+/g, ' ').trim()}`;
    })
    .join('\n');
}

/**
 * Reads the observer's JSON reply, also inside a ```json fence or with text around it.
 * Null if it is not JSON or any field is missing or of the wrong type.
 */
export function parseObserverReply(text: string): ObserverFeedback | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end < start) return null;

  let data: unknown;
  try {
    data = JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
  if (typeof data !== 'object' || data === null) return null;
  const reply = data as Record<string, unknown>;

  if (reply.tooShort === true) {
    return typeof reply.reason === 'string' ? { kind: 'too-short', reason: reply.reason } : null;
  }
  const wentWell = toPoints(reply.wentWell);
  const toImprove = toPoints(reply.toImprove);
  if (!wentWell || !toImprove) return null;
  return { kind: 'feedback', wentWell, toImprove };
}

/** True if `value` is feedback as our server sends it, so the browser can show it safely. */
export function isObserverFeedback(value: unknown): value is ObserverFeedback {
  if (typeof value !== 'object' || value === null) return false;
  const feedback = value as Record<string, unknown>;
  if (feedback.kind === 'too-short') return typeof feedback.reason === 'string';
  return (
    feedback.kind === 'feedback' &&
    toPoints(feedback.wentWell) !== null &&
    toPoints(feedback.toImprove) !== null
  );
}

/**
 * Drops the points whose quote is not something the candidate said, word for word. Case, spacing
 * and punctuation don't matter, but a quote must have at least three whole words. Only the
 * candidate's turns count, so a quote of the interviewer is dropped too.
 */
export function keepGroundedPoints(
  feedback: ObserverFeedback,
  messages: TranscriptMessage[],
): ObserverFeedback {
  if (feedback.kind !== 'feedback') return feedback;

  // Spaces around every text, so only whole words match: «kunde» is not in «kunder».
  const said = messages
    .filter(({ role }) => role === 'user')
    .map(({ content }) => ` ${words(content).join(' ')} `);
  const isGrounded = ({ quote }: ObserverPoint) => {
    const quoted = words(quote);
    return (
      quoted.length >= MIN_QUOTE_WORDS &&
      said.some((answer) => answer.includes(` ${quoted.join(' ')} `))
    );
  };
  return {
    kind: 'feedback',
    wentWell: feedback.wentWell.filter(isGrounded),
    toImprove: feedback.toImprove.filter(isGrounded),
  };
}

function toPoints(value: unknown): ObserverPoint[] | null {
  if (!Array.isArray(value)) return null;
  const points: ObserverPoint[] = [];
  for (const item of value) {
    if (typeof item !== 'object' || item === null) return null;
    const { quote, comment, tip } = item as Record<string, unknown>;
    if (typeof quote !== 'string' || typeof comment !== 'string' || typeof tip !== 'string') {
      return null;
    }
    points.push({ quote, comment, tip });
  }
  return points;
}

/** The words of a text in lower case, without punctuation or quote marks. */
function words(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}
