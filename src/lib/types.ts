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
}
