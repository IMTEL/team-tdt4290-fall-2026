export interface Agent {
  id: string;
  name: string;
  description: string;
  lastUpdated: string;
  /** The advanced settings (see src/domain/advancedSettings.ts). */
  llmModel: string;
  /** Null for agents that RAGdoll returns without one. */
  temperature: number | null;
  prompt: string;
  // Only the agent list has these (see toAgentListItem). Null if the description is not ours.
  /** The id of the agent's avatar (see src/domain/avatars.ts). Null for the default image. */
  avatar?: string | null;
  type?: string | null;
  typeLabel?: string | null;
  stilling?: string | null;
  bransje?: string | null;
  vanskelighetsgrad?: string | null;
  /** The interviewer's role and style, e.g. "Butikksjef, vennlig". A template may store a long text. */
  intervjuer?: string | null;
  /** e.g. "første intervju". */
  intervjutype?: string | null;
  /** The template's name, when the interviewer answer came from one. e.g. "Daglig leder". */
  intervjuerMal?: string | null;
}
