import type { NextRequest } from 'next/server';

import { cleanName } from '@/domain/agentName';
import { cleanPublicDescription } from '@/domain/publication';
import { getSessionToken } from '@/lib/session-tokens';
import { notOwnerResponse, ragdollErrorResponse } from '@/server/errorResponse';
import { isAgentOwner, publishAgent, unpublishAgent } from '@/server/ragdoll';

type Params = { params: Promise<{ agentId: string }> };

/**
 * Publishes one of the logged-in counsellor's own agents to The Candidate, with the name and short
 * description its users see. The Candidate never gets the prompt or the stored answers.
 */
export async function POST(req: NextRequest, { params }: Params) {
  const sessionToken = await getSessionToken(req);
  if (!sessionToken) {
    return Response.json({ error: 'Not signed in' }, { status: 401 });
  }

  let publicName: string | null;
  let publicDescription: string | null;
  try {
    const body = await req.json();
    publicName = cleanName(body?.publicName);
    publicDescription = cleanPublicDescription(body?.publicDescription);
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!publicName) {
    return Response.json({ error: 'Invalid name' }, { status: 400 });
  }
  if (publicDescription === null) {
    return Response.json({ error: 'Invalid description' }, { status: 400 });
  }

  const { agentId } = await params;
  return asOwner(sessionToken, agentId, async () =>
    Response.json({
      publication: await publishAgent(sessionToken, agentId, publicName, publicDescription),
    }),
  );
}

/** Hides one of the logged-in counsellor's own agents from The Candidate. */
export async function DELETE(req: NextRequest, { params }: Params) {
  const sessionToken = await getSessionToken(req);
  if (!sessionToken) {
    return Response.json({ error: 'Not signed in' }, { status: 401 });
  }

  const { agentId } = await params;
  return asOwner(sessionToken, agentId, async () =>
    Response.json({ publication: await unpublishAgent(sessionToken, agentId) }),
  );
}

/** Runs `action` only if the agent is the user's own, not one they collaborate on. */
async function asOwner(
  sessionToken: string,
  agentId: string,
  action: () => Promise<Response>,
): Promise<Response> {
  try {
    // RAGdoll answers 404 if the user has no such agent, and RagdollError carries that.
    if (!(await isAgentOwner(sessionToken, agentId))) {
      return notOwnerResponse('publish the agent');
    }

    return await action();
  } catch (error) {
    return ragdollErrorResponse(error);
  }
}
