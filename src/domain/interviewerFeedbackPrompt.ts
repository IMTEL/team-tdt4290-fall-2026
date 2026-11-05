import { MAX_PROMPT_LENGTH } from './advancedSettings';
import type { MessageFeedback } from './messageFeedback';

/**
 * How counsellor ratings of test-chat replies are written into the interviewer's stored system
 * prompt, so the next replies (in the test chat and in The Candidate) follow them.
 */

/** Heading of the block we add. Unique, so it can be replaced without touching the rest. */
export const FEEDBACK_SECTION_HEADING = '## Tilbakemeldinger fra veilederen';

/**
 * How many of the newest ratings are quoted in full. When there are more, every rating still
 * counts in the summary, and older comments are kept there instead of being dropped.
 */
export const MAX_DETAILED_RATINGS = 10;

/** How many ratings we read from RAGdoll when rewriting the prompt. The list API caps at 200. */
export const MAX_FEEDBACK_TO_READ = 200;

/** First line of the message that asks the observer to summarise counsellor ratings. */
export const RATING_SUMMARY_MARKER = 'SAMMENDRAG AV VURDERINGER:';

/** Longest observer-written summary we keep in the interviewer prompt. */
export const MAX_OBSERVER_RATING_SUMMARY = 1200;

/** Longest quote of a message in a detailed bullet, so one rating cannot fill the prompt. */
const MAX_QUOTE_LENGTH = 280;

/** Longest comment in the summary of all ratings. */
const MAX_SUMMARY_COMMENT_LENGTH = 120;

const HEADING_LINE = new RegExp(`^${escapeRegExp(FEEDBACK_SECTION_HEADING)}\\s*$`, 'm');

/** The prompt without the ratings block, so an edit or a clone does not keep a stale copy. */
export function stripFeedbackSection(prompt: string): string {
  const match = prompt.search(HEADING_LINE);
  if (match === -1) return prompt.trimEnd();
  return prompt.slice(0, match).trimEnd();
}

/**
 * The prompt with a ratings block at the end, or without one if there are no ratings. When there
 * are many ratings, `observerSummary` is used as the summary if it is usable; otherwise comments
 * are listed. Fits in RAGdoll's prompt length by shortening the quoted replies first, then the
 * summary.
 */
export function withFeedbackSection(
  prompt: string,
  ratings: MessageFeedback[],
  maxLength = MAX_PROMPT_LENGTH,
  observerSummary?: string | null,
): string {
  const base = stripFeedbackSection(prompt);
  if (ratings.length === 0) return base;

  const maxDetailed = Math.min(MAX_DETAILED_RATINGS, ratings.length);
  const commentCount = uniqueComments(ratings).length;
  const attempts: Array<{ detailed: number; comments: number; summary: string | null }> = [];
  for (let detailed = maxDetailed; detailed >= 0; detailed--) {
    attempts.push({ detailed, comments: commentCount, summary: observerSummary ?? null });
  }
  for (let comments = commentCount - 1; comments >= 0; comments--) {
    attempts.push({ detailed: 0, comments, summary: null });
  }

  for (const { detailed, comments, summary } of attempts) {
    const next = `${base}\n\n${formatFeedbackSection(ratings, detailed, comments, summary)}`;
    if (next.length <= maxLength) return next;
  }
  return base;
}

/**
 * The ratings block: a count of every rating, a short summary of all comments when there are more
 * than will fit in detail, then the newest replies quoted in full. Empty when there is nothing.
 */
export function formatFeedbackSection(
  ratings: MessageFeedback[],
  detailedCount = Math.min(MAX_DETAILED_RATINGS, ratings.length),
  summaryCommentLimit = uniqueComments(ratings).length,
  observerSummary?: string | null,
): string {
  if (!ratings.length) return '';

  const detailed = ratings.slice(0, Math.max(0, detailedCount));
  const good = detailed.filter(({ rating }) => rating === 'good');
  const bad = detailed.filter(({ rating }) => rating === 'bad');
  const many = ratings.length > MAX_DETAILED_RATINGS;

  const lines = [
    FEEDBACK_SECTION_HEADING,
    `${summarizeRatings(ratings)} Følg dette i alle senere svar. Ikke nevn tilbakemeldingene for jobbsøkeren.`,
  ];

  if (many) {
    const written = observerSummary?.trim();
    if (written) {
      lines.push('', '### Sammendrag', written);
    } else {
      const { good: goodComments, bad: badComments } = commentsByRating(ratings, summaryCommentLimit);
      if (goodComments.length || badComments.length) {
        lines.push('', '### Sammendrag');
        if (goodComments.length) lines.push(`Gjør mer av: ${goodComments.join('; ')}`);
        if (badComments.length) lines.push(`Unngå: ${badComments.join('; ')}`);
      }
    }
  }

  if (good.length || bad.length) {
    if (many) lines.push('', '### Siste vurderinger');
    if (good.length) {
      lines.push('', '### Gjør mer av dette', ...good.map(bullet));
    }
    if (bad.length) {
      lines.push('', '### Unngå dette', ...bad.map(bullet));
    }
  }
  return lines.join('\n');
}

/** A short Norwegian count of how many replies went well and how many were bad. */
export function summarizeRatings(ratings: MessageFeedback[]): string {
  const well = ratings.filter(({ rating }) => rating === 'good').length;
  const bad = ratings.filter(({ rating }) => rating === 'bad').length;
  const total = well + bad;
  if (well > 0 && bad > 0) {
    const badPhrase = bad === 1 ? '1 var dårlig' : `${bad} var dårlige`;
    return `Veilederen har vurdert ${total} svar: ${well} gikk bra, og ${badPhrase}.`;
  }
  if (well > 0) {
    return well === 1
      ? 'Veilederen har vurdert 1 svar, og det gikk bra.'
      : `Veilederen har vurdert ${well} svar, og alle gikk bra.`;
  }
  return bad === 1
    ? 'Veilederen har vurdert 1 svar, og det var dårlig.'
    : `Veilederen har vurdert ${bad} svar, og alle var dårlige.`;
}

/**
 * The observer's user message when it should summarise counsellor ratings instead of judging the
 * job seeker. Starts with `RATING_SUMMARY_MARKER` so the observer prompt can tell the two tasks
 * apart.
 */
export function formatRatingsForObserver(ratings: MessageFeedback[]): string {
  const lines = [RATING_SUMMARY_MARKER, summarizeRatings(ratings), ''];
  const good = ratings.filter(({ rating }) => rating === 'good');
  const bad = ratings.filter(({ rating }) => rating === 'bad');
  if (good.length) {
    lines.push('Bra:', ...good.map(observerLine), '');
  }
  if (bad.length) {
    lines.push('Dårlig:', ...bad.map(observerLine));
  }
  return lines.join('\n').trimEnd();
}

/**
 * The observer's prose summary, or null if the reply is empty or still in the job-seeker
 * `Bra: … | … | …` format, so the prompt can fall back to a count of the comments.
 */
export function parseObserverRatingSummary(text: string): string | null {
  let summary = text
    .trim()
    .replace(/^```(?:\w+)?\s*/, '')
    .replace(/\s*```$/, '')
    .trim();
  if (!summary) return null;
  if (/^(bra|bedre|for kort)\s*:/im.test(summary) && summary.includes('|')) return null;
  if (summary.length > MAX_OBSERVER_RATING_SUMMARY) {
    summary = `${summary.slice(0, MAX_OBSERVER_RATING_SUMMARY - 1).trimEnd()}…`;
  }
  return summary;
}

function observerLine({ userMessage, agentMessage, comment }: MessageFeedback): string {
  const note = comment.trim() ? ` Kommentar: ${clip(comment.trim(), MAX_SUMMARY_COMMENT_LENGTH)}.` : '';
  return `- Jobbsøkeren sa: ${quote(userMessage)} Du svarte: ${quote(agentMessage)}${note}`;
}

function commentsByRating(
  ratings: MessageFeedback[],
  limit: number,
): { good: string[]; bad: string[] } {
  const good: string[] = [];
  const bad: string[] = [];
  let kept = 0;
  for (const item of ratings) {
    if (kept >= limit) break;
    const comment = item.comment.trim();
    if (!comment) continue;
    const clipped = clip(comment, MAX_SUMMARY_COMMENT_LENGTH);
    const list = item.rating === 'good' ? good : bad;
    if (list.includes(clipped)) continue;
    list.push(clipped);
    kept += 1;
  }
  return { good, bad };
}

function uniqueComments(ratings: MessageFeedback[]): string[] {
  const seen = new Set<string>();
  const comments: string[] = [];
  for (const item of ratings) {
    const comment = item.comment.trim();
    if (!comment || seen.has(comment)) continue;
    seen.add(comment);
    comments.push(comment);
  }
  return comments;
}

function bullet({ userMessage, agentMessage, comment }: MessageFeedback): string {
  const said = quote(userMessage);
  const reply = quote(agentMessage);
  const note = comment.trim() ? ` Veilederen: ${clip(comment.trim(), MAX_QUOTE_LENGTH)}.` : '';
  return `- Jobbsøkeren sa: ${said} Du svarte: ${reply}${note}`;
}

function quote(text: string): string {
  return `«${clip(text.replace(/\s+/g, ' ').trim(), MAX_QUOTE_LENGTH)}».`;
}

function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
