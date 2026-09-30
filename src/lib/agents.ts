export const AGENT_NAMES = ['configurator', 'interviewer'] as const;
export type AgentName = (typeof AGENT_NAMES)[number]; // 'configurator' | 'interviewer'
