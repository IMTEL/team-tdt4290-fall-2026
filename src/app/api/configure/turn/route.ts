import type { NextRequest } from 'next/server';

import {
  findJobTemplate,
  jobConfiguration,
  type JobTemplate,
} from '@/data/job-templates';
import { findBuiltInLegalTemplate } from '@/data/legal-templates';
import { findBuiltInTemplate, type AgentTemplate } from '@/data/templates';
import { buildBriefing, parseAnswers } from '@/domain/agentTypes/configurator';
import { DEFAULT_AGENT_TYPE, getAgentType } from '@/domain/agentTypes/registry';
import type { AgentTypeDefinition, AnswerSources, Answers } from '@/domain/agentTypes/types';
import { getSessionToken } from '@/lib/session-tokens';
import { isRagdollMessage } from '@/server/chatMessages';
import { configErrorResponse, ragdollErrorResponse } from '@/server/errorResponse';
import { describeJobSeeker } from '@/domain/jobSeekerProfile';
import {
  describeLegalFrameworks,
  LEGAL_TEMPLATE_LIMITS,
  type LegalTemplate,
} from '@/domain/legalTemplate';
import { fromRagdollLegalTemplate } from '@/server/legalTemplateMapper';
import { fromRagdollProfile } from '@/server/profileMapper';
import {
  askAgent,
  getProfile,
  getTemplate,
  RagdollError,
  type RagdollMessage,
} from '@/server/ragdoll';
import { chatRetryAfter, tooManyRequestsResponse } from '@/server/rateLimit';
import { fromRagdollTemplate } from '@/server/templateMapper';

/**
 * One turn of the configuration chat. Sends the conversation to the shared configurator agent,
 * after a briefing built from the agent type's definition, and checks whether its reply finishes
 * the configuration. A template, industry template or profile the counsellor chose decides the
 * fields the type's presets name, so the configurator doesn't ask about them, but gets their text
 * to fit the rest to. Legal templates fill in a field the configurator never asks about. A finished
 * configuration comes with the sources of the template, profile and legal template answers.
 */
export async function POST(req: NextRequest) {
  // The configurator is shared, but only logged-in counsellors may use it (it spends IDUN quota).
  const sessionToken = await getSessionToken(req);
  if (!sessionToken) {
    return Response.json({ error: 'Not signed in' }, { status: 401 });
  }
  const retryAfter = chatRetryAfter(sessionToken);
  if (retryAfter > 0) {
    return tooManyRequestsResponse(retryAfter);
  }

  let definition: AgentTypeDefinition | undefined;
  let messages: RagdollMessage[];
  let templateId: string | undefined;
  let profileId: string | undefined;
  let jobTemplateId: string | undefined;
  let legalTemplateIds: string[] = [];
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
    // No agentType means a client from before agent types could be chosen: an interviewer.
    definition = getAgentType(body.agentType ?? DEFAULT_AGENT_TYPE);
    if (!definition) {
      return Response.json({ error: 'Unknown agent type' }, { status: 400 });
    }
    // No templateId means the counsellor started without a template.
    if (body.templateId !== undefined) {
      if (
        typeof body.templateId !== 'string' ||
        !body.templateId ||
        !definition.presets?.template
      ) {
        return Response.json({ error: 'Unknown template' }, { status: 400 });
      }
      templateId = body.templateId;
    }
    // No profileId means the counsellor didn't choose a job seeker profile.
    if (body.profileId !== undefined) {
      if (
        typeof body.profileId !== 'string' ||
        !body.profileId ||
        !definition.presets?.jobSeekerProfile
      ) {
        return Response.json({ error: 'Unknown profile' }, { status: 400 });
      }
      profileId = body.profileId;
    }
    // No jobTemplateId means the counsellor started without a stillingsmal. Accept the old
    // industryTemplateId name so older clients still work.
    const rawJobTemplateId = body.jobTemplateId ?? body.industryTemplateId;
    if (rawJobTemplateId !== undefined) {
      if (
        typeof rawJobTemplateId !== 'string' ||
        !rawJobTemplateId ||
        !definition.presets?.jobTemplate
      ) {
        return Response.json({ error: 'Unknown job template' }, { status: 400 });
      }
      jobTemplateId = rawJobTemplateId;
    }
    // No legalTemplateIds means the counsellor chose no legal templates.
    if (body.legalTemplateIds !== undefined) {
      const ids: unknown = body.legalTemplateIds;
      if (
        !Array.isArray(ids) ||
        ids.length > LEGAL_TEMPLATE_LIMITS.perAgent ||
        !ids.every((item) => typeof item === 'string' && item) ||
        new Set(ids).size !== ids.length ||
        !definition.presets?.legalTemplates
      ) {
        return Response.json({ error: 'Unknown legal template' }, { status: 400 });
      }
      legalTemplateIds = ids;
    }
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  let template: AgentTemplate | undefined;
  if (templateId) {
    try {
      template = await findAnyTemplate(sessionToken, templateId);
    } catch (error) {
      return ragdollErrorResponse(error);
    }
    // A template for another agent type has text for another field.
    if (!template || template.agentType !== definition.id) {
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

  // Built-in stillingsmaler live in code, so there is nothing to load from RAGdoll.
  let jobTemplate: JobTemplate | undefined;
  if (jobTemplateId) {
    jobTemplate = findJobTemplate(jobTemplateId);
    if (!jobTemplate) {
      return Response.json({ error: 'Unknown job template' }, { status: 400 });
    }
  }

  let legalTemplates: LegalTemplate[];
  try {
    legalTemplates = await Promise.all(
      legalTemplateIds.map((legalId) => findAnyLegalTemplate(sessionToken, legalId)),
    ).then((found) => found.filter((template) => template !== undefined));
  } catch (error) {
    return ragdollErrorResponse(error);
  }
  if (legalTemplates.length !== legalTemplateIds.length) {
    return Response.json({ error: 'Unknown legal template' }, { status: 400 });
  }

  const id = process.env.RAGDOLL_CONFIGURATOR_AGENT_ID;
  const accessKey = process.env.RAGDOLL_CONFIGURATOR_ACCESS_KEY;
  if (!id || !accessKey) {
    console.error('The configurator agent is not set in the environment variables');
    return configErrorResponse();
  }

  // The template's and profile's text goes into these answers unchanged, so this is where we know
  // where they came from.
  const decided: Answers = {};
  const sources: AnswerSources = {};
  const {
    jobSeekerProfile,
    jobTemplate: jobTemplatePreset,
    legalTemplates: legalField,
  } = definition.presets ?? {};
  const templateField = definition.presets?.template?.field;
  if (templateField && template?.persona) {
    decided[templateField] = template.persona;
    sources[templateField] = { kind: 'template', id: template.id };
  }
  if (jobSeekerProfile && jobSeeker && profileId) {
    decided[jobSeekerProfile] = jobSeeker;
    sources[jobSeekerProfile] = { kind: 'profile', id: profileId };
  }
  // No source: the edit form has no stillingsmal choice, so there is nothing to show it in.
  if (jobTemplatePreset && jobTemplate) {
    const { stilling, bransje } = jobConfiguration(jobTemplate);
    decided[jobTemplatePreset.job] = stilling;
    decided[jobTemplatePreset.industry] = bransje;
  }
  if (legalField && legalTemplates.length > 0) {
    decided[legalField] = describeLegalFrameworks(legalTemplates);
    sources[legalField] = { kind: 'legal', ids: legalTemplates.map(({ id }) => id) };
  }

  // The briefing goes first, so the configurator knows what to ask before it reads the chat.
  const briefing: RagdollMessage = {
    role: 'user',
    content: buildBriefing(definition, decided),
  };

  try {
    const reply = await askAgent({ id, accessKey }, [briefing, ...messages]);
    const configuration = parseAnswers(reply, definition, decided);
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
): Promise<AgentTemplate | undefined> {
  const builtIn = findBuiltInTemplate(templateId);
  if (builtIn) return builtIn;

  try {
    return fromRagdollTemplate(await getTemplate(sessionToken, templateId)) ?? undefined;
  } catch (error) {
    if (error instanceof RagdollError && error.kind === 'not-found') return undefined;
    throw error;
  }
}

/** A built-in legal template, or one the counsellor has saved in RAGdoll. Undefined if neither. */
async function findAnyLegalTemplate(
  sessionToken: string,
  templateId: string,
): Promise<LegalTemplate | undefined> {
  const builtIn = findBuiltInLegalTemplate(templateId);
  if (builtIn) return builtIn;

  try {
    return fromRagdollLegalTemplate(await getTemplate(sessionToken, templateId)) ?? undefined;
  } catch (error) {
    if (error instanceof RagdollError && error.kind === 'not-found') return undefined;
    throw error;
  }
}
