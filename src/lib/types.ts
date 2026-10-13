export interface Agent {
  id: string;
  name: string;
  description: string;
  lastUpdated: string;
  // Only the agent list has these (see toAgentListItem). Null if the description is not ours.
  type?: string | null;
  typeLabel?: string | null;
  stilling?: string | null;
  bransje?: string | null;
  vanskelighetsgrad?: string | null;
}
