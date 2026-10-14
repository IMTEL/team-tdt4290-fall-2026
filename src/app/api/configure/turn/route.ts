import type { NextRequest } from 'next/server';

import { findTemplate, type InterviewerTemplate } from '@/data/interviewer-templates';
import type { AnswerSources } from '@/domain/agentTypes/types';
import { parseConfiguration } from '@/domain/configuration';
import { getSessionToken } from '@/lib/session-tokens';
import { isRagdollMessage } from '@/server/chatMessages';
import { configErrorResponse, ragdollErrorResponse } from '@/server/errorResponse';
import { describeJobSeeker } from '@/domain/jobSeekerProfile';
import { fromRagdollProfile } from '@/server/profileMapper';
import {
  askAgent,
  getProfile,
  getTemplate,
  RagdollError,
  type RagdollMessage,
} from '@/server/ragdoll';
import { fromRagdollTemplate } from '@/server/templateMapper';

/**
 * One turn of the configuration chat. Sends the conversation to the shared configurator agent
 * and checks whether its reply finishes the configuration. If the counsellor chose a template, it
 * decides the interviewer, and a job seeker profile decides the job seeker, so the configurator
 * doesn't ask about them. A finished configuration comes with the sources of those answers.
 */
export async function POST(req: NextRequest) {
  // The configurator is shared, but only logged-in counsellors may use it (it spends IDUN quota).
  const sessionToken = await getSessionToken(req);
  if (!sessionToken) {
    return Response.json({ error: 'Not signed in' }, { status: 401 });
  }

  let messages: RagdollMessage[];
  let templateId: string | undefined;
  let profileId: string | undefined;
  try {
    const body = await req.json();
    if (
      !Array.isArray(body?.messages) ||
      body.messages.length === 0 ||
      !body.messages.every(isRagdollMessage)
    ) {
      return Response.json({ error: 'Invalid messages in request body' }, { status: 400 });
    }
    messages = body.messages;
    // No templateId means the counsellor started without a template.
    if (body.templateId !== undefined) {
      if (typeof body.templateId !== 'string' || !body.templateId) {
        return Response.json({ error: 'Unknown template' }, { status: 400 });
      }
      templateId = body.templateId;
    }
    // No profileId means the counsellor didn't choose a job seeker profile.
    if (body.profileId !== undefined) {
      if (typeof body.profileId !== 'string' || !body.profileId) {
        return Response.json({ error: 'Unknown profile' }, { status: 400 });
      }
      profileId = body.profileId;
    }
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  let template: InterviewerTemplate | undefined;
  if (templateId) {
    try {
      template = await findAnyTemplate(sessionToken, templateId);
    } catch (error) {
      return ragdollErrorResponse(error);
    }
    if (!template) {
      return Response.json({ error: 'Unknown template' }, { status: 400 });
    }
  }

  let jobSeeker: string | undefined;
  if (profileId) {
    try {
      jobSeeker = describeJobSeeker(fromRagdollProfile(await getProfile(sessionToken, profileId)));
    } catch (error) {
      if (error instanceof RagdollError && error.kind === 'not-found') {
        return Response.json({ error: 'Unknown profile' }, { status: 400 });
      }
      return ragdollErrorResponse(error);
    }
  }

  const id = process.env.RAGDOLL_CONFIGURATOR_AGENT_ID;
  const accessKey = process.env.RAGDOLL_CONFIGURATOR_ACCESS_KEY;
  if (!id || !accessKey) {
    console.error('The configurator agent is not set in the environment variables');
    return configErrorResponse();
  }

  // The template's and profile's text goes into these answers unchanged, so this is where we know
  // where they came from.
  const sources: AnswerSources = {
    ...(template?.persona && { intervjuer: { kind: 'template', id: template.id } }),
    ...(jobSeeker && profileId && { jobbsoker: { kind: 'profile', id: profileId } }),
  };

  try {
    const reply = await askAgent({ id, accessKey }, messages);
    const configuration = parseConfiguration(reply, {
      intervjuer: template?.persona,
      jobbsoker: jobSeeker,
    });
    return Response.json({
      reply,
      configuration,
      sources: configuration ? sources : {},
      done: configuration !== null,
    });
  } catch (error) {
    return ragdollErrorResponse(error);
  }
}

/** A built-in template, or one the counsellor has saved in RAGdoll. Undefined if neither. */
async function findAnyTemplate(
  sessionToken: string,
  templateId: string,
): Promise<InterviewerTemplate | undefined> {
  const builtIn = findTemplate(templateId);
  if (builtIn) return builtIn;

  try {
    return fromRagdollTemplate(await getTemplate(sessionToken, templateId)) ?? undefined;
  } catch (error) {
    if (error instanceof RagdollError && error.kind === 'not-found') return undefined;
    throw error;
  }
}
