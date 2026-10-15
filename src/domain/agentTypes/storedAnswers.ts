import { type AvatarId, cleanAvatar } from '../avatars';
import { DEFAULT_AGENT_TYPE, getAgentType } from './registry';
import type { AgentTypeDefinition, AnswerSource, AnswerSources, Answers } from './types';

// Bump this if the answers of a type ever change so much that old saves must be converted.
const VERSION = 1;

/**
 * An agent's answers, together with the agent type they belong to and where they came from.
 * `customPrompt` is true when the counsellor wrote the system prompt by hand, so the answers must
 * not rebuild it. `avatar` is the id of the agent's avatar, or null for the default image.
 */
export type StoredAnswers = {
  definition: AgentTypeDefinition;
  answers: Answers;
  sources: AnswerSources;
  customPrompt: boolean;
  avatar: AvatarId | null;
};

/**
 * Turns the answers, and the sources of those that came from a template or profile, into the text
 * we save in the RAGdoll agent's description.
 */
export function toStoredDescription(
  definition: AgentTypeDefinition,
  answers: Answers,
  sources: AnswerSources = {},
  { customPrompt = false, avatar = null }: { customPrompt?: boolean; avatar?: string | null } = {},
): string {
  // The flag and the avatar are only written when they are set, so agents saved before they
  // existed read as false and as having no avatar. An id that is not one of ours is left out too.
  const avatarId = cleanAvatar(avatar);
  return JSON.stringify({
    type: definition.id,
    version: VERSION,
    answers,
    sources,
    ...(customPrompt && { customPrompt: true }),
    ...(avatarId && { avatar: avatarId }),
  });
}

/**
 * The valid sources in `value`, for fields the agent type has. Anything else is left out, so a
 * bad or old source never stops an agent from being read or saved. The ids are not checked here:
 * they only label where a text came from, and the edit form only trusts one whose text still
 * matches.
 */
export function cleanSources(definition: AgentTypeDefinition, value: unknown): AnswerSources {
  if (typeof value !== 'object' || value === null) return {};
  const saved = value as Record<string, unknown>;
  return Object.fromEntries(
    definition.fields.flatMap(({ key }) => {
      const source = saved[key];
      return isSource(source) ? [[key, { kind: source.kind, id: source.id }]] : [];
    }),
  );
}

function isSource(value: unknown): value is AnswerSource {
  if (typeof value !== 'object' || value === null) return false;
  const source = value as Record<string, unknown>;
  return (
    (source.kind === 'template' || source.kind === 'profile') &&
    typeof source.id === 'string' &&
    source.id !== ''
  );
}

/**
 * Reads the answers back out of an agent's description. Returns null if the description is not
 * something we saved. Answers may be empty if the agent type got new fields after saving.
 */
export function readStoredAnswers(description: string): StoredAnswers | null {
  let saved: unknown;
  try {
    saved = JSON.parse(description);
  } catch {
    return null;
  }
  if (typeof saved !== 'object' || saved === null) return null;

  const { type, answers, sources, customPrompt, avatar } = unwrap(saved as Record<string, unknown>);

  const definition = typeof type === 'string' ? getAgentType(type) : undefined;
  if (!definition || typeof answers !== 'object' || answers === null) return null;

  const filled = fillFields(definition, answers as Record<string, unknown>);
  // Some JSON without a single one of our answers in it was not saved by us.
  if (Object.values(filled).every((answer) => answer === '')) return null;

  return {
    definition,
    answers: filled,
    sources: cleanSources(definition, sources),
    customPrompt: customPrompt === true,
    avatar: cleanAvatar(avatar),
  };
}

/**
 * One answer for each field the agent type has now. A field added after the agent was saved
 * becomes empty, so the counsellor can fill it in. Answers to removed fields are left out.
 */
function fillFields(definition: AgentTypeDefinition, saved: Record<string, unknown>): Answers {
  return Object.fromEntries(
    definition.fields.map(({ key }) => {
      const answer = saved[key];
      return [key, typeof answer === 'string' ? answer : ''];
    }),
  );
}

/**
 * Agents saved before agent types existed have only the answers, with no envelope around them.
 * Those were all interviewers.
 */
function unwrap(saved: Record<string, unknown>): {
  type: unknown;
  answers: unknown;
  sources: unknown;
  customPrompt: unknown;
  avatar: unknown;
} {
  if ('type' in saved && 'answers' in saved) {
    // Agents saved before sources existed have none.
    return {
      type: saved.type,
      answers: saved.answers,
      sources: saved.sources,
      customPrompt: saved.customPrompt,
      avatar: saved.avatar,
    };
  }
  return {
    type: DEFAULT_AGENT_TYPE,
    answers: saved,
    sources: undefined,
    customPrompt: false,
    avatar: undefined,
  };
}
