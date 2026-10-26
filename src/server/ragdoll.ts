// Adapter for RAGdoll's API. Server only: it uses the agents' access keys.

export type RagdollAgent = { id: string; accessKey: string; roleName?: string };
export type RagdollMessage = { role: 'user' | 'assistant'; content: string };

export type RagdollErrorKind =
  'config' | 'timeout' | 'unreachable' | 'bad-response' | 'unauthorized' | 'not-found' | 'rejected';

/** A failure talking to RAGdoll. `message` is technical and only meant for the server log. */
export class RagdollError extends Error {
  constructor(
    readonly kind: RagdollErrorKind,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = 'RagdollError';
  }
}

const TIMEOUT_MS = 30000;

/**
 * Sends the chat history to the shared configurator agent and returns the reply text.
 * Goes to RAGDOLL_API_URL, where the configurator lives. Throws RagdollError.
 */
export async function askAgent(agent: RagdollAgent, messages: RagdollMessage[]): Promise<string> {
  return askAt('RAGDOLL_API_URL', agent, messages);
}

/**
 * Sends the chat history to one of the logged-in user's saved agents and returns the reply text.
 * Goes to BACKEND_API_URL: the RAGdoll the agent was saved in, which may not be the configurator's.
 * Throws RagdollError.
 */
export async function askSavedAgent(
  agent: RagdollAgent,
  messages: RagdollMessage[],
): Promise<string> {
  return askAt('BACKEND_API_URL', agent, messages);
}

async function askAt(
  urlVariable: 'RAGDOLL_API_URL' | 'BACKEND_API_URL',
  agent: RagdollAgent,
  messages: RagdollMessage[],
): Promise<string> {
  const apiUrl = process.env[urlVariable];
  if (!apiUrl) {
    throw new RagdollError('config', `${urlVariable} is not set`);
  }

  let res: Response;
  try {
    res = await fetch(`${apiUrl.replace(/\/$/, '')}/api/chat/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent_id: agent.id,
        access_key: agent.accessKey,
        chat_log: messages,
        active_role_id: agent.roleName,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (cause) {
    if (cause instanceof Error && cause.name === 'TimeoutError') {
      throw new RagdollError('timeout', `No answer from RAGdoll after ${TIMEOUT_MS} ms`, {
        cause,
      });
    }
    throw new RagdollError('unreachable', 'Could not reach RAGdoll', { cause });
  }

  if (!res.ok) {
    throw new RagdollError('unreachable', `RAGdoll answered ${res.status}: ${await res.text()}`);
  }

  // RAGdoll wraps the pipeline result: { response: { id, model, context_used, ..., response: '<text>' } }
  const data = await res.json().catch(() => null);
  const reply = data?.response?.response;
  if (typeof reply !== 'string') {
    throw new RagdollError(
      'bad-response',
      `Unexpected response from RAGdoll: ${JSON.stringify(data)}`,
    );
  }

  return reply;
}

/** A role in a RAGdoll agent. The Candidate chats with a published agent through its role. */
export type RagdollRole = {
  name: string;
  description: string;
  document_access: string[];
  function_access: string[];
};

/** What we send to RAGdoll to create an agent. The fields follow RAGdoll's Agent model. */
export type NewRagdollAgent = {
  name: string;
  description: string;
  prompt: string;
  roles: RagdollRole[];
  llm_provider: string;
  llm_model: string;
  llm_temperature: number;
  llm_api_key: string;
  embedding_model: string;
  embedding_api_key: string;
  context_aware_retrieval: boolean;
  last_updated: string;
};

/**
 * A whole agent as RAGdoll gives it to its owner, with the keys. Never send it to the browser.
 * It also has fields we don't use. We keep them, because an update resets every field we leave out.
 */
export type FullRagdollAgent = NewRagdollAgent & { id: string; [field: string]: unknown };

/** An agent as we pass it on. Only safe fields: RAGdoll also returns the agent's keys. */
export type RagdollAgentSummary = {
  id: string;
  name: string;
  description: string;
  lastUpdated: string;
  /** The advanced settings. Safe: the owner may see the model, temperature and prompt. */
  llmModel: string;
  /** Null for agents that RAGdoll returns without one. */
  temperature: number | null;
  prompt: string;
  /** Whether The Candidate lists the agent. Optional so older summaries still fit. */
  isPublished?: boolean;
  /** The name and short description The Candidate shows. Kept when the agent is hidden. */
  publicName?: string;
  publicDescription?: string;
};

/** Whether an agent is published to The Candidate, and what The Candidate shows of it. */
export type PublicationStatus = {
  isPublished: boolean;
  publicName: string;
  publicDescription: string;
};

/** Creates an agent owned by the logged-in user and returns its new id. */
export async function saveAgent(sessionToken: string, agent: NewRagdollAgent): Promise<string> {
  const data = await requestAsUser(sessionToken, '/agents', {
    method: 'POST',
    body: JSON.stringify(agent),
  });

  const id = (data as { id?: unknown }).id;
  if (typeof id !== 'string') {
    throw new RagdollError('bad-response', 'RAGdoll did not return the new agent id');
  }
  return id;
}

/** Lists the agents the logged-in user owns or collaborates on. Throws RagdollError. */
export async function listAgents(sessionToken: string): Promise<RagdollAgentSummary[]> {
  const data = await requestAsUser(sessionToken, '/agents');
  if (!Array.isArray(data)) {
    throw new RagdollError('bad-response', 'RAGdoll did not return a list of agents');
  }

  // Pick out only the fields we need. This also leaves the agents' API keys behind.
  return data.map(toSummary);
}

/**
 * The whole agent with this id, keys included, if it is one of the logged-in user's agents.
 * Throws RagdollError, with kind 'not-found' if the user has no agent with this id.
 */
export async function fetchFullAgent(
  sessionToken: string,
  agentId: string,
): Promise<FullRagdollAgent> {
  // The list only has the user's own agents, so an agent missing from it is not theirs.
  const data = await requestAsUser(sessionToken, '/agents');
  if (!Array.isArray(data)) {
    throw new RagdollError('bad-response', 'RAGdoll did not return a list of agents');
  }

  const agent = data.find((item) => item?.id === agentId);
  if (!agent) {
    throw new RagdollError('not-found', `The user has no agent with id ${agentId}`);
  }
  return agent as FullRagdollAgent;
}

/** Saves changes to an existing agent, and returns it without the keys. Throws RagdollError. */
export async function updateAgent(
  sessionToken: string,
  agent: FullRagdollAgent,
): Promise<RagdollAgentSummary> {
  // Empty keys tell RAGdoll to keep the stored ones, so the keys never travel back. RAGdoll keeps
  // the agent's access keys itself, and the list only gives us their metadata, so leave them out.
  const fields: Record<string, unknown> = { ...agent };
  delete fields.access_key;
  const path = `/agents/${encodeURIComponent(agent.id)}`;
  const data = await requestAsUser(sessionToken, path, {
    method: 'POST',
    body: JSON.stringify({ ...fields, llm_api_key: '', embedding_api_key: '' }),
  });

  if (typeof (data as { id?: unknown }).id !== 'string') {
    throw new RagdollError('bad-response', 'RAGdoll did not return the updated agent');
  }
  return toSummary(data as Record<string, unknown>);
}

/**
 * The names of the language models RAGdoll offers through IDUN. Asked with the project's IDUN key,
 * which stays on the server. Throws RagdollError.
 */
export async function listLanguageModels(sessionToken: string, idunKey: string): Promise<string[]> {
  const data = await requestAsUser(sessionToken, '/get_models', {
    method: 'POST',
    body: JSON.stringify({ provider: 'idun', api_key: idunKey }),
  });
  if (!Array.isArray(data)) {
    throw new RagdollError('bad-response', 'RAGdoll did not return a list of models');
  }

  // Only the names: the descriptions and GDPR flags are not shown.
  return data
    .map((model) => (isObject(model) ? model.name : undefined))
    .filter((name): name is string => typeof name === 'string' && name !== '');
}

/**
 * Gets a key to chat with one of the user's agents. RAGdoll makes a new 24-hour key on every call.
 * Throws RagdollError.
 */
export async function getChatAccessKey(sessionToken: string, agentId: string): Promise<string> {
  const data = await requestAsUser(
    sessionToken,
    `/agents/${encodeURIComponent(agentId)}/accesskeys`,
    { method: 'POST' },
  );
  const key = (data as { key?: unknown }).key;
  if (typeof key !== 'string') {
    throw new RagdollError('bad-response', 'RAGdoll did not return a chat access key');
  }
  return key;
}

/**
 * Returns the name of the agent's role, or null if it has none. RAGdoll sends the owner the whole
 * agent with its API keys, so only the role name is picked out. Throws RagdollError.
 */
export async function getAgentRole(sessionToken: string, agentId: string): Promise<string | null> {
  const data = await requestAsUser(sessionToken, `/agents/${encodeURIComponent(agentId)}`);
  const roles = (data as { roles?: unknown }).roles;
  if (!Array.isArray(roles)) {
    throw new RagdollError('bad-response', 'RAGdoll did not return an agent with roles');
  }
  if (roles.length === 0) return null;

  // Our agents have one role, built by their agent type (see src/domain/agentTypes).
  const name = (roles[0] as { name?: unknown } | null)?.name;
  if (typeof name !== 'string') {
    throw new RagdollError('bad-response', 'RAGdoll returned a role without a name');
  }
  return name;
}

/**
 * Whether the logged-in user owns the agent, not just collaborates on it.
 */
export async function isAgentOwner(sessionToken: string, agentId: string): Promise<boolean> {
  const path = `/agents/${encodeURIComponent(agentId)}/collaborators`;
  const data = (await requestAsUser(sessionToken, path)) as { is_owner?: unknown };

  if (typeof data.is_owner !== 'boolean') {
    throw new RagdollError('bad-response', 'RAGdoll did not say who owns the agent');
  }
  return data.is_owner;
}

/**
 * Publishes one of the logged-in user's own agents to The Candidate, with the name and short
 * description the app's users see. Throws RagdollError.
 */
export async function publishAgent(
  sessionToken: string,
  agentId: string,
  publicName: string,
  publicDescription: string,
): Promise<PublicationStatus> {
  const path = `/agents/${encodeURIComponent(agentId)}/publish`;
  const data = await requestAsUser(sessionToken, path, {
    method: 'POST',
    body: JSON.stringify({ public_name: publicName, public_description: publicDescription }),
  });
  return toPublicationStatus(data);
}

/** Hides one of the logged-in user's own agents from The Candidate. Throws RagdollError. */
export async function unpublishAgent(
  sessionToken: string,
  agentId: string,
): Promise<PublicationStatus> {
  const path = `/agents/${encodeURIComponent(agentId)}/unpublish`;
  return toPublicationStatus(await requestAsUser(sessionToken, path, { method: 'POST' }));
}

/** Deletes one of the logged-in user's own agents */
export async function deleteAgent(sessionToken: string, agentId: string): Promise<void> {
  const path = `/agents/${encodeURIComponent(agentId)}`;
  await requestAsUser(sessionToken, path, { method: 'DELETE' }, { allowEmpty: true });
}

/** A template as RAGdoll stores it. RAGdoll does not read `content`; we decide its shape. */
export type RagdollTemplate = {
  id: string;
  type: string;
  name: string;
  description: string;
  content: Record<string, unknown>;
};

/** What we send to RAGdoll to create a template. */
export type NewRagdollTemplate = Omit<RagdollTemplate, 'id'>;

/** Lists the logged-in user's own templates of one type, newest first. Throws RagdollError. */
export async function listTemplates(
  sessionToken: string,
  type: string,
): Promise<RagdollTemplate[]> {
  const data = await requestAsUser(sessionToken, `/templates?type=${encodeURIComponent(type)}`);
  if (!Array.isArray(data)) {
    throw new RagdollError('bad-response', 'RAGdoll did not return a list of templates');
  }
  return data.map(toTemplate);
}

/**
 * One of the logged-in user's own templates. Throws RagdollError, with kind 'not-found' if the
 * user has no template with this id.
 */
export async function getTemplate(
  sessionToken: string,
  templateId: string,
): Promise<RagdollTemplate> {
  return toTemplate(
    await requestAsUser(sessionToken, `/templates/${encodeURIComponent(templateId)}`),
  );
}

/** Creates a template owned by the logged-in user and returns it. Throws RagdollError. */
export async function createTemplate(
  sessionToken: string,
  template: NewRagdollTemplate,
): Promise<RagdollTemplate> {
  return toTemplate(
    await requestAsUser(sessionToken, '/templates', {
      method: 'POST',
      body: JSON.stringify(template),
    }),
  );
}

/**
 * Replaces one of the logged-in user's own templates and returns it. Throws RagdollError, with
 * kind 'not-found' if the user has no template with this id.
 */
export async function updateTemplate(
  sessionToken: string,
  templateId: string,
  template: NewRagdollTemplate,
): Promise<RagdollTemplate> {
  return toTemplate(
    await requestAsUser(sessionToken, `/templates/${encodeURIComponent(templateId)}`, {
      method: 'PUT',
      body: JSON.stringify(template),
    }),
  );
}

/** Deletes one of the logged-in user's own templates. Throws RagdollError. */
export async function deleteTemplate(sessionToken: string, templateId: string): Promise<void> {
  const path = `/templates/${encodeURIComponent(templateId)}`;
  await requestAsUser(sessionToken, path, { method: 'DELETE' }, { allowEmpty: true });
}

/**
 * A job seeker profile as RAGdoll stores it, without the owner and the timestamps.
 * The fields follow RAGdoll's JobSeekerProfile model.
 */
export type RagdollProfile = {
  id: string;
  label: string;
  age_range: string | null;
  experience_level: string | null;
  education: string;
  work_experience: string;
  languages: string[];
  practice_areas: string[];
  notes: string;
};

/** What we send to RAGdoll to create or replace a profile. */
export type NewRagdollProfile = Omit<RagdollProfile, 'id'>;

/** Lists the logged-in user's own profiles, most recently changed first. Throws RagdollError. */
export async function listProfiles(sessionToken: string): Promise<RagdollProfile[]> {
  const data = await requestAsUser(sessionToken, '/profiles');
  if (!Array.isArray(data)) {
    throw new RagdollError('bad-response', 'RAGdoll did not return a list of profiles');
  }
  return data.map(toProfile);
}

/**
 * One of the logged-in user's own profiles. Throws RagdollError, with kind 'not-found' if the
 * user has no profile with this id.
 */
export async function getProfile(sessionToken: string, profileId: string): Promise<RagdollProfile> {
  return toProfile(await requestAsUser(sessionToken, `/profiles/${encodeURIComponent(profileId)}`));
}

/** Creates a profile owned by the logged-in user and returns it. Throws RagdollError. */
export async function createProfile(
  sessionToken: string,
  profile: NewRagdollProfile,
): Promise<RagdollProfile> {
  return toProfile(
    await requestAsUser(sessionToken, '/profiles', {
      method: 'POST',
      body: JSON.stringify(profile),
    }),
  );
}

/**
 * Replaces one of the logged-in user's own profiles and returns it. Throws RagdollError, with
 * kind 'not-found' if the user has no profile with this id.
 */
export async function updateProfile(
  sessionToken: string,
  profileId: string,
  profile: NewRagdollProfile,
): Promise<RagdollProfile> {
  return toProfile(
    await requestAsUser(sessionToken, `/profiles/${encodeURIComponent(profileId)}`, {
      method: 'PUT',
      body: JSON.stringify(profile),
    }),
  );
}

/** Deletes one of the logged-in user's own profiles. Throws RagdollError. */
export async function deleteProfile(sessionToken: string, profileId: string): Promise<void> {
  const path = `/profiles/${encodeURIComponent(profileId)}`;
  await requestAsUser(sessionToken, path, { method: 'DELETE' }, { allowEmpty: true });
}

/** RAGdoll keeps each app's settings apart. This is ours. */
const SETTINGS_NAMESPACE = 'interview-configurator';

export type UserSettings = Record<string, unknown>;

/** The logged-in user's settings for this app. Empty if none are saved. Throws RagdollError. */
export async function getUserSettings(sessionToken: string): Promise<UserSettings> {
  return toSettings(await requestAsUser(sessionToken, `/user-settings/${SETTINGS_NAMESPACE}`));
}

/** Replaces the logged-in user's settings for this app. Throws RagdollError. */
export async function saveUserSettings(
  sessionToken: string,
  settings: UserSettings,
): Promise<UserSettings> {
  return toSettings(
    await requestAsUser(sessionToken, `/user-settings/${SETTINGS_NAMESPACE}`, {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),
  );
}

// Helpers

/**
 * Calls RAGdoll as the logged-in user, with their session token. Throws RagdollError.
 * Goes to BACKEND_API_URL: the RAGdoll the user logged in to.
 */
async function requestAsUser(
  sessionToken: string,
  path: string,
  init: RequestInit = {},
  { allowEmpty = false }: { allowEmpty?: boolean } = {},
): Promise<unknown> {
  const apiUrl = process.env.BACKEND_API_URL;
  if (!apiUrl) {
    throw new RagdollError('config', 'BACKEND_API_URL is not set');
  }

  let res: Response;
  try {
    res = await fetch(`${apiUrl.replace(/\/$/, '')}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (cause) {
    if (cause instanceof Error && cause.name === 'TimeoutError') {
      throw new RagdollError('timeout', `No answer from RAGdoll after ${TIMEOUT_MS} ms`, {
        cause,
      });
    }
    throw new RagdollError('unreachable', 'Could not reach RAGdoll', { cause });
  }

  // RAGdoll answers 401 for an expired or missing token, and 422 for a broken one.
  if (res.status === 401) {
    throw new RagdollError('unauthorized', `RAGdoll answered 401: ${await res.text()}`);
  }
  // 422 is also how RAGdoll rejects a body it doesn't accept, with a list of field errors. That
  // means our request and RAGdoll's model disagree, so it must not look like being logged out.
  if (res.status === 422) {
    const text = await res.text();
    const kind = isFieldErrorList(text) ? 'rejected' : 'unauthorized';
    throw new RagdollError(kind, `RAGdoll answered 422: ${text}`);
  }
  if (res.status === 404) {
    throw new RagdollError('not-found', `RAGdoll answered 404: ${await res.text()}`);
  }
  if (!res.ok) {
    throw new RagdollError('unreachable', `RAGdoll answered ${res.status}: ${await res.text()}`);
  }

  const data = await res.json().catch(() => null);
  if (data === null && !allowEmpty) {
    throw new RagdollError('bad-response', 'RAGdoll did not answer with JSON');
  }
  return data;
}

/**
 * True if the body is FastAPI's answer to a request that didn't match its model:
 * `{detail: [{loc, msg, ...}, ...]}`. A broken token gives `{detail: "<message>"}` instead.
 */
function isFieldErrorList(text: string): boolean {
  try {
    return Array.isArray(JSON.parse(text)?.detail);
  } catch {
    return false;
  }
}

/** Only the fields we pass on. This also leaves the agent's API keys behind. */
function toSummary(agent: Record<string, unknown>): RagdollAgentSummary {
  return {
    id: String(agent.id),
    name: String(agent.name),
    description: String(agent.description),
    lastUpdated: String(agent.last_updated),
    llmModel: typeof agent.llm_model === 'string' ? agent.llm_model : '',
    temperature: typeof agent.llm_temperature === 'number' ? agent.llm_temperature : null,
    prompt: typeof agent.prompt === 'string' ? agent.prompt : '',
    // Agents saved before RAGdoll had these fields come without them.
    isPublished: agent.is_published === true,
    publicName: typeof agent.public_name === 'string' ? agent.public_name : '',
    publicDescription: typeof agent.public_description === 'string' ? agent.public_description : '',
  };
}

function toPublicationStatus(data: unknown): PublicationStatus {
  if (
    !isObject(data) ||
    typeof data.is_published !== 'boolean' ||
    typeof data.public_name !== 'string' ||
    typeof data.public_description !== 'string'
  ) {
    throw new RagdollError('bad-response', 'RAGdoll did not return a publication status');
  }
  return {
    isPublished: data.is_published,
    publicName: data.public_name,
    publicDescription: data.public_description,
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Only the fields we use. Leaves out the owner and the timestamps. */
function toTemplate(data: unknown): RagdollTemplate {
  if (
    !isObject(data) ||
    typeof data.id !== 'string' ||
    typeof data.type !== 'string' ||
    typeof data.name !== 'string' ||
    typeof data.description !== 'string' ||
    !isObject(data.content)
  ) {
    throw new RagdollError('bad-response', 'RAGdoll did not return a template');
  }
  const { id, type, name, description, content } = data;
  return { id, type, name, description, content };
}

function toSettings(data: unknown): UserSettings {
  if (!isObject(data)) {
    throw new RagdollError('bad-response', 'RAGdoll did not return settings');
  }
  return data;
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

/** Only the fields we use. Leaves out the owner and the timestamps. */
function toProfile(data: unknown): RagdollProfile {
  const isNullableString = (value: unknown) => value === null || typeof value === 'string';
  if (
    !isObject(data) ||
    typeof data.id !== 'string' ||
    typeof data.label !== 'string' ||
    !isNullableString(data.age_range) ||
    // Profiles saved before RAGdoll had these fields come without them.
    !isNullableString(data.experience_level ?? null) ||
    typeof data.education !== 'string' ||
    typeof data.work_experience !== 'string' ||
    !isStringList(data.languages) ||
    !isStringList(data.practice_areas ?? []) ||
    typeof data.notes !== 'string'
  ) {
    throw new RagdollError('bad-response', 'RAGdoll did not return a profile');
  }
  return {
    id: data.id,
    label: data.label,
    age_range: data.age_range as string | null,
    experience_level: (data.experience_level ?? null) as string | null,
    education: data.education,
    work_experience: data.work_experience,
    languages: data.languages,
    practice_areas: (data.practice_areas ?? []) as string[],
    notes: data.notes,
  };
}
