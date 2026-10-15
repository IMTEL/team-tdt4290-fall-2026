import type { NextRequest } from 'next/server';

import {
  type AdvancedSettings,
  DEFAULT_ADVANCED_SETTINGS,
  parseAdvancedSettings,
} from '@/domain/advancedSettings';
import { DEFAULT_AGENT_TYPE, getAgentType, hasAllAnswers } from '@/domain/agentTypes/registry';
import { cleanSources } from '@/domain/agentTypes/storedAnswers';
import type { AgentTypeDefinition } from '@/domain/agentTypes/types';

import { getSessionToken } from '@/lib/session-tokens';
import { toAgentListItem, toRagdollAgent } from '@/server/agentMapper';
import { configErrorResponse, ragdollErrorResponse } from '@/server/errorResponse';
import { modelsToValidate } from '@/server/models';
import { listAgents, saveAgent } from '@/server/ragdoll';
import { MAX_NAME_LENGTH } from '@/domain/agentName';
import { cleanName } from '@/domain/agentName';

/**
 * Saves a new agent of the chosen type, owned by the logged-in counsellor. Returns its id.
 * `advanced` (model, temperature, hand-written prompt) is optional: without it the defaults apply.
 */
export async function POST(req: NextRequest) {
  const sessionToken = await getSessionToken(req);
  if (!sessionToken) {
    return Response.json({ error: 'Not signed in' }, { status: 401 });
  }

  let name: string | null;
  let definition: AgentTypeDefinition | undefined;
  let configuration;
  let advanced: unknown;
  let sources: unknown;
  try {
    const body = await req.json();
    name = cleanName(body?.name);
    // No type means a client from before agent types could be chosen: an interviewer.
    definition = getAgentType(body?.type ?? DEFAULT_AGENT_TYPE);
    configuration = body?.configuration;
    advanced = body?.advanced;
    sources = body?.sources;
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!name || name.length > MAX_NAME_LENGTH) {
    return Response.json({ error: 'Invalid name' }, { status: 400 });
  }
  if (!definition) {
    return Response.json({ error: 'Unknown agent type' }, { status: 400 });
  }
  if (!hasAllAnswers(definition, configuration)) {
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

    const agent = toRagdollAgent(
      name,
      definition,
      configuration,
      idunKey,
      cleanSources(definition, sources),
      settings,
    );
    const id = await saveAgent(sessionToken, agent);
    return Response.json({ id }, { status: 201 });
  } catch (error) {
    return ragdollErrorResponse(error);
  }
}

/** Lists the logged-in counsellor's agents, without any keys, with what the agent cards show. */
export async function GET(req: NextRequest) {
  const sessionToken = await getSessionToken(req);
  if (!sessionToken) {
    return Response.json({ error: 'Not signed in' }, { status: 401 });
  }

  try {
    const agents = await listAgents(sessionToken);
    return Response.json({ agents: agents.map(toAgentListItem) });
  } catch (error) {
    return ragdollErrorResponse(error);
  }
}
