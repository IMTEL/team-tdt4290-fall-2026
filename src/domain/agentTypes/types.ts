/** The counsellor's answers, one text per field. Every agent type stores its answers like this. */
export type Answers = Record<string, string>;

/**
 * Where an answer's text came from: an interviewer template or a job seeker profile, by id.
 * The text itself is still in the answers; this only remembers the origin, so the edit form can
 * show which template or profile was used.
 */
export type AnswerSource = { kind: 'template' | 'profile'; id: string };

/** The source of each answer that came from one, by field key. */
export type AnswerSources = Record<string, AnswerSource>;

/** One thing the counsellor decides about an agent. */
export type AgentField = { key: string; label: string };

/** A role. The mapper turns it into a RAGdoll role. */
export type AgentRole = { name: string; description: string };

/**
 * Everything that is special about one kind of agent.
 */
export type AgentTypeDefinition = {
  id: string;
  /** The name of the agent type, as counsellors see it, e.g. "Intervjuer". */
  label: string;
  fields: AgentField[];
  buildPrompt: (answers: Answers) => string;
  buildRoles: (name: string, answers: Answers) => AgentRole[];
  defaultName: (answers: Answers) => string;
};
