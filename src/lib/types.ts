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
  type?: string | null;
  typeLabel?: string | null;
  stilling?: string | null;
  bransje?: string | null;
  vanskelighetsgrad?: string | null;
}
