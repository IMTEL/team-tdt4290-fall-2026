import type { NextRequest } from 'next/server';

import { type AdvancedSettings, parseAdvancedSettings } from '@/domain/advancedSettings';
import { cleanName } from '@/domain/agentName';
import { hasAllAnswers } from '@/domain/agentTypes/registry';
import { cleanSources, readStoredAnswers } from '@/domain/agentTypes/storedAnswers';
import { parseAvatarChoice } from '@/domain/avatars';
import { getSessionToken } from '@/lib/session-tokens';
import { applyEdit } from '@/server/agentMapper';
import { ragdollErrorResponse } from '@/server/errorResponse';
import { modelsToValidate } from '@/server/models';
import {
  deleteAgent,
  fetchFullAgent,
  isAgentOwner,
  unpublishAgent,
  updateAgent,
} from '@/server/ragdoll';

type Params = { params: Promise<{ agentId: string }> };

/**
 * Saves a new name, new answers and, optionally, new advanced settings and a new avatar for one of
 * the logged-in counsellor's agents. The prompt is rebuilt from the answers unless the counsellor
 * wrote it by hand, and every other field of the agent is kept. Without `avatar` the agent keeps
 * its avatar, and `null` gives it the default image. A published agent is hidden from The Candidate,
 * so the owner tests it before publishing it again.
 */
export async function PUT(req: NextRequest, { params }: Params) {
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

  const { agentId } = await params;

  try {
    const existing = await fetchFullAgent(sessionToken, agentId);

    // The agent type comes from what is stored, never from the browser.
    const stored = readStoredAnswers(existing.description);
    if (!stored) {
      return Response.json({ error: 'Agent has no configuration to edit' }, { status: 400 });
    }
    if (!hasAllAnswers(stored.definition, answers)) {
      return Response.json({ error: 'Invalid answers' }, { status: 400 });
    }

    // Without `advanced`, the agent keeps the settings it has.
    let settings: AdvancedSettings | undefined;
    if (advanced !== undefined) {
      // The agent's current model stays valid even if IDUN no longer lists it.
      const models = await modelsToValidate(sessionToken, advanced, [existing.llm_model]);
      if (!models) {
        return Response.json({ error: 'Could not check the language model' }, { status: 502 });
      }
      const parsed = parseAdvancedSettings(advanced, models);
      if (!parsed) {
        return Response.json({ error: 'Invalid advanced settings' }, { status: 400 });
      }
      settings = parsed;
    }

    // A published agent is hidden before the change is saved, so The Candidate never gets a version
    // nobody has tested. If saving fails after this, the agent is hidden and unchanged. Only the
    // owner may hide an agent, so only the owner may edit a published one.
    if (existing.is_published === true) {
      if (!(await isAgentOwner(sessionToken, agentId))) {
        return Response.json(
          { error: 'Only the owner can edit a published agent' },
          { status: 403 },
        );
      }
      await unpublishAgent(sessionToken, agentId);
    }

    const edited = applyEdit(
      existing,
      name,
      stored.definition,
      answers,
      cleanSources(stored.definition, sources),
      settings,
      undefined,
      avatar,
    );
    return Response.json({ agent: await updateAgent(sessionToken, edited) });
  } catch (error) {
    return ragdollErrorResponse(error);
  }
}

/** Deletes one of the logged-in user's agents.*/
export async function DELETE(req: NextRequest, { params }: Params) {
  const sessionToken = await getSessionToken(req);
  if (!sessionToken) {
    return Response.json({ error: 'Not signed in' }, { status: 401 });
  }

  const { agentId } = await params;

  try {
    await fetchFullAgent(sessionToken, agentId);

    if (!(await isAgentOwner(sessionToken, agentId))) {
      return Response.json({ error: 'Only the owner can delete the agent' }, { status: 403 });
    }

    await deleteAgent(sessionToken, agentId);
    return new Response(null, { status: 204 });
  } catch (error) {
    return ragdollErrorResponse(error);
  }
}
