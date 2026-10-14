import type { NextRequest } from 'next/server';

import { type AdvancedSettings, parseAdvancedSettings } from '@/domain/advancedSettings';
import { cleanName } from '@/domain/agentName';
import { hasAllAnswers } from '@/domain/agentTypes/registry';
import { cleanSources, readStoredAnswers } from '@/domain/agentTypes/storedAnswers';
import { parseAvatarChoice } from '@/domain/avatars';
import { getSessionToken } from '@/lib/session-tokens';
import { currentAvatar, currentSettings, toRagdollAgent } from '@/server/agentMapper';
import { configErrorResponse, ragdollErrorResponse } from '@/server/errorResponse';
import { modelsToValidate } from '@/server/models';
import { fetchFullAgent, saveAgent } from '@/server/ragdoll';

type Params = { params: Promise<{ agentId: string }> };

/**
 * Saves a new agent made from one of the logged-in counsellor's agents, with the name, answers and,
 * optionally, advanced settings from the clone form. Without new settings the clone gets the
 * original's model, temperature and hand-written prompt, and without a new `avatar` it gets the
 * original's avatar. The original agent is only read, never changed. Returns the new agent's id.
 */
export async function POST(req: NextRequest, { params }: Params) {
  const sessionToken = await getSessionToken(req);
  if (!sessionToken) {
    return Response.json({ error: 'Not signed in' }, { status: 401 });
  }

  let name: string | null;
  let answers: unknown;
  let advanced: unknown;
  let sources: unknown;
  let avatar: ReturnType<typeof parseAvatarChoice>;
  try {
    const body = await req.json();
    name = cleanName(body?.name);
    answers = body?.answers;
    advanced = body?.advanced;
    sources = body?.sources;
    avatar = parseAvatarChoice(body?.avatar);
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!name) {
    return Response.json({ error: 'Invalid name' }, { status: 400 });
  }
  if (avatar === 'invalid') {
    return Response.json({ error: 'Invalid avatar' }, { status: 400 });
  }

  const idunKey = process.env.IDUN_API_KEY;
  if (!idunKey) {
    console.error('IDUN_API_KEY is not set');
    return configErrorResponse();
  }

  const { agentId } = await params;

  try {
    const original = await fetchFullAgent(sessionToken, agentId);

    // The agent type comes from the original, never from the browser.
    const stored = readStoredAnswers(original.description);
    if (!stored) {
      return Response.json({ error: 'Agent has no configuration to clone' }, { status: 400 });
    }
    if (!hasAllAnswers(stored.definition, answers)) {
      return Response.json({ error: 'Invalid answers' }, { status: 400 });
    }

    // Without `advanced`, the clone gets the settings the original has.
    let settings: AdvancedSettings = currentSettings(original);
    if (advanced !== undefined) {
      // The original's model stays valid even if IDUN no longer lists it.
      const models = await modelsToValidate(sessionToken, advanced, [original.llm_model]);
      if (!models) {
        return Response.json({ error: 'Could not check the language model' }, { status: 502 });
      }
      const parsed = parseAdvancedSettings(advanced, models);
      if (!parsed) {
        return Response.json({ error: 'Invalid advanced settings' }, { status: 400 });
      }
      settings = parsed;
    }

    const clone = toRagdollAgent(
      name,
      stored.definition,
      answers,
      idunKey,
      cleanSources(stored.definition, sources),
      settings,
      undefined,
      // Without a new avatar, the clone looks like the original.
      avatar === undefined ? currentAvatar(original) : avatar,
    );
    const id = await saveAgent(sessionToken, clone);
    return Response.json({ id }, { status: 201 });
  } catch (error) {
    return ragdollErrorResponse(error);
  }
}
