import type { NextRequest } from 'next/server';

import {
  type AdvancedSettings,
  DEFAULT_ADVANCED_SETTINGS,
  parseAdvancedSettings,
} from '@/domain/advancedSettings';
import { interviewer } from '@/domain/agentTypes/interviewer';
import { hasAllAnswers } from '@/domain/agentTypes/registry';

import { getSessionToken } from '@/lib/session-tokens';
import { toRagdollAgent } from '@/server/agentMapper';
import { configErrorResponse, ragdollErrorResponse } from '@/server/errorResponse';
import { modelsToValidate } from '@/server/models';
import { listAgents, saveAgent } from '@/server/ragdoll';
import { MAX_NAME_LENGTH } from '@/domain/agentName';
import { cleanName } from '@/domain/agentName';

/**
 * Saves a new interviewer agent, owned by the logged-in counsellor. Returns its id.
 * `advanced` (model, temperature, hand-written prompt) is optional: without it the defaults apply.
 */
export async function POST(req: NextRequest) {
  const sessionToken = await getSessionToken(req);
  if (!sessionToken) {
    return Response.json({ error: 'Not signed in' }, { status: 401 });
  }

  let name: string | null;
  let configuration;
  let advanced: unknown;
  try {
    const body = await req.json();
    name = cleanName(body?.name);
    configuration = body?.configuration;
    advanced = body?.advanced;
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!name || name.length > MAX_NAME_LENGTH) {
    return Response.json({ error: 'Invalid name' }, { status: 400 });
  }
  // The configurator only makes interviewers until #56 lets the counsellor choose the agent type.
  if (!hasAllAnswers(interviewer, configuration)) {
    return Response.json({ error: 'Invalid configuration' }, { status: 400 });
  }

  const idunKey = process.env.IDUN_API_KEY;
  if (!idunKey) {
    console.error('IDUN_API_KEY is not set');
    return configErrorResponse();
  }

  try {
    let settings: AdvancedSettings = DEFAULT_ADVANCED_SETTINGS;
    if (advanced !== undefined) {
      const models = await modelsToValidate(sessionToken, advanced);
      if (!models) {
        return Response.json({ error: 'Could not check the language model' }, { status: 502 });
      }
      const parsed = parseAdvancedSettings(advanced, models);
      if (!parsed) {
        return Response.json({ error: 'Invalid advanced settings' }, { status: 400 });
      }
      settings = parsed;
    }

    const agent = toRagdollAgent(name, interviewer, configuration, idunKey, settings);
    const id = await saveAgent(sessionToken, agent);
    return Response.json({ id }, { status: 201 });
  } catch (error) {
    return ragdollErrorResponse(error);
  }
}

/** Lists the logged-in counsellor's agents, without any keys. */
export async function GET(req: NextRequest) {
  const sessionToken = await getSessionToken(req);
  if (!sessionToken) {
    return Response.json({ error: 'Not signed in' }, { status: 401 });
  }

  try {
    return Response.json({ agents: await listAgents(sessionToken) });
  } catch (error) {
    return ragdollErrorResponse(error);
  }
}
