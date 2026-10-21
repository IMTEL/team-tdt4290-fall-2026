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
  /** Whether The Candidate lists the agent. */
  isPublished?: boolean;
  /** The name and short description The Candidate shows. Kept when the agent is hidden. */
  publicName?: string;
  publicDescription?: string;
  // Only the agent list has these (see toAgentListItem). Null if the description is not ours.
  /** The id of the agent's avatar (see src/domain/avatars.ts). Null for the default image. */
  avatar?: string | null;
  type?: string | null;
  typeLabel?: string | null;
  stilling?: string | null;
  bransje?: string | null;
  vanskelighetsgrad?: string | null;
}
