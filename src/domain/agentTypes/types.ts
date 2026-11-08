/** The counsellor's answers, one text per field. Every agent type stores its answers like this. */
export type Answers = Record<string, string>;

/** An answer that came from one interviewer template or one job seeker profile, by id. */
export type SingleAnswerSource = { kind: 'template' | 'profile'; id: string };

/** An answer made from several legal templates together, by id, in the order they were chosen. */
export type LegalAnswerSource = { kind: 'legal'; ids: string[] };

/**
 * Where an answer's text came from. The text itself is still in the answers; this only remembers
 * the origin, so the edit form can show which template, profile or legal templates were used.
 */
export type AnswerSource = SingleAnswerSource | LegalAnswerSource;

/** The source of each answer that came from one, by field key. */
export type AnswerSources = Record<string, AnswerSource>;

/** One thing the counsellor decides about an agent. */
export type AgentField = {
  key: string;
  /** Shown on the details page and in the edit form. */
  label: string;
  /** The counsellor may leave it empty, e.g. Tillegg. */
  optional?: boolean;
};

/** How one answer changes the agent's behaviour, in sentences for the counsellor. */
export type AnswerEffect = { key: string; label: string; effects: string[] };

/** A role. The mapper turns it into a RAGdoll role. */
export type AgentRole = { name: string; description: string };

/** How the template form and picker talk about this type's templates. */
export type TemplateText = {
  /** Help under the template's name, e.g. "Hvem er intervjueren? For eksempel «Butikksjef»." */
  titleHint: string;
  /** Help under the short description shown on the template's card. */
  descriptionHint: string;
  /** The label of the text that fills in the field, e.g. "Beskrivelse av intervjueren". */
  textLabel: string;
  /** Help under that text. */
  textHint: string;
  /** Above the template cards on /configure: what a template decides here. */
  pickerLead: string;
};

/**
 * Which field a ready-made text fills in, when the counsellor picks one in the wizard. The edit
 * form offers the same choice.
 */
export type AgentPresets = {
  /**
   * The field a template's text fills in, and how to talk about such templates. A type with this
   * can be chosen for a template on /create-template.
   */
  template?: { field: string; text: TemplateText };
  /** The field a job seeker profile's description fills in. */
  jobSeekerProfile?: string;
  /** The field the chosen legal templates fill in, together. The field should be optional. */
  legalTemplates?: string;
};

/**
 * Everything that is special about one kind of agent. The pages and routes read everything from
 * here; only the form wizard on /configure is still written for each type (see docs/extending.md).
 */
export type AgentTypeDefinition = {
  id: string;
  /** The name of the agent type, as counsellors see it, e.g. "Intervjuer". */
  label: string;
  /** One sentence for the type chooser on /configure. */
  description: string;
  /** In the order the details page and the edit form show them. */
  fields: AgentField[];
  presets?: AgentPresets;
  buildPrompt: (answers: Answers) => string;
  /**
   * A few sentences in plain Norwegian about the agent, for the top of the details page. Built
   * from the answers only. Returns "" if there is nothing to say.
   */
  buildSummary: (answers: Answers) => string;
  /**
   * Which answers change how the agent behaves, and how, in the order of the fields. Only effects
   * the prompt from buildPrompt really has. Answers that change nothing are left out.
   */
  explainAnswers: (answers: Answers) => AnswerEffect[];
  buildRoles: (name: string, answers: Answers) => AgentRole[];
  defaultName: (answers: Answers) => string;
};

/** An agent type we plan to support, shown in the chooser as "Kommer snart". */
export type PlannedAgentType = { id: string; label: string; description: string };
