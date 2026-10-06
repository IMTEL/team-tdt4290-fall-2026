import { LABELS, type Configuration } from '../configuration';
import { buildPrompt } from '../interviewerPrompt';
import type { AgentTypeDefinition } from './types';

/** An interviewer for a practice job interview in The Candidate. */
export const interviewer: AgentTypeDefinition = {
  id: 'interviewer',
  fields: Object.entries(LABELS).map(([key, label]) => ({ key, label })),
  // Safe cast: answers are checked with hasAllAnswers before a prompt is built.
  buildPrompt: (answers) => buildPrompt(answers as Configuration),
  // The Candidate lists an agent's roles as the interviewers to choose from.
  buildRoles: (name, answers) => [{ name, description: answers.intervjuer }],
  defaultName: (answers) => `Intervjuer for ${answers.stilling}`,
};
