import type { RagdollMessage } from './ragdoll';

/** True if `value` is one chat turn as the browser sends it: a role and a text. */
export function isRagdollMessage(value: unknown): value is RagdollMessage {
  if (typeof value !== 'object' || value === null) return false;
  const { role, content } = value as Record<string, unknown>;
  return (role === 'user' || role === 'assistant') && typeof content === 'string';
}
