import type { Answers } from './agentTypes/types';
import { cleanAnswer as clean, lowerFirst } from './answerText';
import { difficultyLevel } from './difficulty';

// The longest the job seeker's description may be in the summary. The summary is only a few
// sentences, and the full text is in the list below it.
const JOB_SEEKER_MAX_LENGTH = 160;

/**
 * A short text for the counsellor about the interviewer, in plain Norwegian: who it is for, what
 * kind of interview it is and who it is made for. At most three sentences, built only from the
 * stored answers. A sentence is left out when its answers are empty, and the result is "" if
 * nothing is known at all.
 */
export function buildInterviewerSummary(answers: Answers): string {
  return [whoSentence(answers), interviewSentence(answers), jobSeekerSentence(answers)]
    .filter((sentence) => sentence !== '')
    .join(' ');
}

/** "Dette er en intervjuer for stillingen butikkmedarbeider i bransjen varehandel (privat)." */
function whoSentence(answers: Answers): string {
  const position = clean(answers.stilling);
  // Only the name and employer; a bransjemal's text after «|» is too long for the summary.
  const industry = clean(answers.bransje?.split('|')[0]);
  if (!position && !industry) return '';

  const forPosition = position ? ` for stillingen ${lowerFirst(position)}` : '';
  const inIndustry = industry ? ` i bransjen ${lowerFirst(industry)}` : '';
  return `Dette er en intervjuer${forPosition}${inIndustry}.`;
}

/** "Det er et første intervju med vanskelighetsgrad lett." */
function interviewSentence(answers: Answers): string {
  const type = lowerFirst(clean(answers.intervjutype));
  const level = lowerFirst(clean(difficultyLevel(answers.vanskelighetsgrad)));
  const withLevel = level ? `med vanskelighetsgrad ${level}` : '';

  if (type && /intervju$/i.test(type)) return `Det er et ${type}${withLevel && ` ${withLevel}`}.`;
  if (type) return `Intervjutypen er ${type}${withLevel && `, ${withLevel}`}.`;
  if (level) return `Vanskelighetsgraden er ${level}.`;
  return '';
}

/** "Jobbsøkeren er beskrevet slik: aldersgruppe 18–24 år; arbeidserfaring: ingen." */
function jobSeekerSentence(answers: Answers): string {
  const jobSeeker = clean(answers.jobbsoker);
  if (!jobSeeker) return '';

  const text = shorten(jobSeeker);
  // The "…" ends the sentence by itself.
  return `Jobbsøkeren er beskrevet slik: ${text}${text.endsWith('…') ? '' : '.'}`;
}

/** The text cut after a whole part (parts are split by ";"), with "…" if something was left out. */
function shorten(text: string): string {
  if (text.length <= JOB_SEEKER_MAX_LENGTH) return text;

  const kept: string[] = [];
  for (const part of text.split(';').map((p) => p.trim())) {
    if ([...kept, part].join('; ').length > JOB_SEEKER_MAX_LENGTH) break;
    kept.push(part);
  }
  // A single part that is too long on its own is cut in the middle of a word instead.
  const shortened = kept.length > 0 ? kept.join('; ') : text.slice(0, JOB_SEEKER_MAX_LENGTH).trim();
  return `${shortened}…`;
}
