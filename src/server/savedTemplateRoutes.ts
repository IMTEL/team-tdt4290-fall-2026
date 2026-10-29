import type { NextRequest } from 'next/server';

import { getSessionToken } from '@/lib/session-tokens';
import { ragdollErrorResponse } from './errorResponse';
import {
  createTemplate,
  deleteTemplate,
  getTemplate,
  listTemplates,
  RagdollError,
  updateTemplate,
  type NewRagdollTemplate,
  type RagdollTemplate,
} from './ragdoll';

/** One kind of template the counsellor saves in RAGdoll, such as a stillingsmal. */
export type SavedTemplateKind<New, Saved> = {
  /** RAGdoll's template type. */
  type: string;
  /** The template from a request body, or null if it is not valid. */
  parse: (body: unknown) => New | null;
  toRagdoll: (template: New) => NewRagdollTemplate;
  /** The template from what RAGdoll stores, or null if it is of another type or the wrong shape. */
  fromRagdoll: (stored: RagdollTemplate) => Saved | null;
};

type Params = { params: Promise<{ templateId: string }> };

const notSignedIn = () => Response.json({ error: 'Not signed in' }, { status: 401 });
const notFound = () => Response.json({ error: 'Not found' }, { status: 404 });

/** The request's JSON as a template, or the response to send back when it is not one. */
async function readTemplate<New>(
  req: NextRequest,
  parse: (body: unknown) => New | null,
): Promise<{ template: New } | { response: Response }> {
  let template;
  try {
    template = parse(await req.json());
  } catch {
    return { response: Response.json({ error: 'Invalid JSON' }, { status: 400 }) };
  }
  if (!template) return { response: Response.json({ error: 'Invalid template' }, { status: 400 }) };
  return { template };
}

/** GET lists the logged-in counsellor's own templates of this kind, newest first; POST saves one. */
export function savedTemplateListRoutes<New, Saved>(kind: SavedTemplateKind<New, Saved>) {
  async function GET(req: NextRequest) {
    const sessionToken = await getSessionToken(req);
    if (!sessionToken) return notSignedIn();

    try {
      const stored = await listTemplates(sessionToken, kind.type);
      // One we can't read is left out, so it doesn't hide the others.
      const templates = stored.map(kind.fromRagdoll).filter((template) => template !== null);
      return Response.json({ templates });
    } catch (error) {
      return ragdollErrorResponse(error);
    }
  }

  async function POST(req: NextRequest) {
    const sessionToken = await getSessionToken(req);
    if (!sessionToken) return notSignedIn();

    const read = await readTemplate(req, kind.parse);
    if ('response' in read) return read.response;

    try {
      const stored = await createTemplate(sessionToken, kind.toRagdoll(read.template));
      return Response.json({ template: kind.fromRagdoll(stored) }, { status: 201 });
    } catch (error) {
      return ragdollErrorResponse(error);
    }
  }

  return { GET, POST };
}

/** GET, PUT and DELETE for one of the logged-in counsellor's own templates of this kind. */
export function savedTemplateRoutes<New, Saved>(kind: SavedTemplateKind<New, Saved>) {
  /**
   * True if the id is one of the counsellor's templates of this kind. RAGdoll checks the owner; we
   * check the type, so these routes never change or delete a template of another kind.
   */
  async function isOfKind(sessionToken: string, templateId: string): Promise<boolean> {
    try {
      return kind.fromRagdoll(await getTemplate(sessionToken, templateId)) !== null;
    } catch (error) {
      if (error instanceof RagdollError && error.kind === 'not-found') return false;
      throw error;
    }
  }

  async function GET(req: NextRequest, { params }: Params) {
    const sessionToken = await getSessionToken(req);
    if (!sessionToken) return notSignedIn();

    const { templateId } = await params;

    try {
      const template = kind.fromRagdoll(await getTemplate(sessionToken, templateId));
      if (!template) return notFound();
      return Response.json({ template });
    } catch (error) {
      return ragdollErrorResponse(error);
    }
  }

  async function PUT(req: NextRequest, { params }: Params) {
    const sessionToken = await getSessionToken(req);
    if (!sessionToken) return notSignedIn();

    const read = await readTemplate(req, kind.parse);
    if ('response' in read) return read.response;

    const { templateId } = await params;

    try {
      if (!(await isOfKind(sessionToken, templateId))) return notFound();
      const stored = await updateTemplate(sessionToken, templateId, kind.toRagdoll(read.template));
      return Response.json({ template: kind.fromRagdoll(stored) });
    } catch (error) {
      return ragdollErrorResponse(error);
    }
  }

  async function DELETE(req: NextRequest, { params }: Params) {
    const sessionToken = await getSessionToken(req);
    if (!sessionToken) return notSignedIn();

    const { templateId } = await params;

    try {
      if (!(await isOfKind(sessionToken, templateId))) return notFound();
      await deleteTemplate(sessionToken, templateId);
      return new Response(null, { status: 204 });
    } catch (error) {
      return ragdollErrorResponse(error);
    }
  }

  return { GET, PUT, DELETE };
}
