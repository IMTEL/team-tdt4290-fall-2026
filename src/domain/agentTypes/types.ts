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
export type AgentField = {
  key: string;
  /** Shown on the details page, and the line's label in the KONFIGURASJON block. */
  label: string;
  /** What the configurator asks the counsellor, e.g. "Hvilken stilling skal jobbsøkeren øve til?" */
  question: string;
  /** More for the configurator about what to find out, such as examples or a default. */
  hint?: string;
  /** How the configurator writes the answer in the block, e.g. "første/andre intervju". */
  format?: string;
};

/** A role. The mapper turns it into a RAGdoll role. */
export type AgentRole = { name: string; description: string };

/**
 * What the configuration chat needs to know about an agent type. The server turns it into a
 * briefing for the shared configurator agent, so the configurator's prompt in RAGdoll never names
 * a type or a question.
 */
export type ConfiguratorSetup = {
  /** Who the agent talks to and why, e.g. job seekers practising a job interview. */
  purpose: string;
  /** The opening line of the chat, before the first question, e.g. "Hei! Jeg hjelper deg …". */
  greeting: string;
  /** Rules that only this agent type has. The configurator's prompt has the shared ones. */
  rules: string[];
};

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
 * Which field a ready-made text fills in, when the counsellor picks one before the chat. Such a
 * field is not asked about, and the edit form offers the same choice.
 */
export type AgentPresets = {
  /**
   * The field a template's text fills in, and how to talk about such templates. A type with this
   * can be chosen for a template on /create-template.
   */
  template?: { field: string; text: TemplateText };
  /** The field a job seeker profile's description fills in. */
  jobSeekerProfile?: string;
  /** The fields an industry template fills in: the job, and the industry with its sector. */
  industryTemplate?: { job: string; industry: string };
};

/**
 * Everything that is special about one kind of agent. Adding a type is one file with one of
 * these, and one line in registry.ts: the pages, routes and configurator read everything from here.
 */
export type AgentTypeDefinition = {
  id: string;
  /** The name of the agent type, as counsellors see it, e.g. "Intervjuer". */
  label: string;
  /** One sentence for the type chooser on /configure. */
  description: string;
  /** In the order the configurator asks about them. */
  fields: AgentField[];
  configurator: ConfiguratorSetup;
  presets?: AgentPresets;
  buildPrompt: (answers: Answers) => string;
  buildRoles: (name: string, answers: Answers) => AgentRole[];
  defaultName: (answers: Answers) => string;
};

/** An agent type we plan to support, shown in the chooser as "Kommer snart". */
export type PlannedAgentType = { id: string; label: string; description: string };
