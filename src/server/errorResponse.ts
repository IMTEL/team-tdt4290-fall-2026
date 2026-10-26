import { RagdollError, type RagdollErrorKind } from './ragdoll';

// What the browser gets for each RAGdoll failure. Never RAGdoll's own message.
const errorResponses: Record<RagdollErrorKind, { status: number; error: string }> = {
  config: { status: 500, error: 'Server configuration error' },
  timeout: { status: 504, error: 'Request to RAGdoll API timed out' },
  unreachable: { status: 502, error: 'Error from RAGdoll API' },
  'bad-response': { status: 502, error: 'Invalid response from RAGdoll API' },
  unauthorized: { status: 401, error: 'Not signed in' },
  'not-found': { status: 404, error: 'Not found' },
  // We check what the browser sends ourselves, so RAGdoll rejecting it is our problem, not theirs.
  rejected: { status: 502, error: 'RAGdoll rejected the request' },
};

/**
 * Turns an error from talking to RAGdoll into a safe response for the browser, and logs it.
 * Not found is not logged: it is the browser asking for something deleted or never made, not a
 * fault on our side, and the 404 already tells it so.
 */
export function ragdollErrorResponse(error: unknown): Response {
  if (!(error instanceof RagdollError && error.kind === 'not-found')) {
    console.error('Error talking to RAGdoll:', error);
  }
  // Anything that is not a RagdollError is a bug in our code, not a RAGdoll problem.
  const { status, error: message } =
    error instanceof RagdollError
      ? errorResponses[error.kind]
      : { status: 500, error: 'Internal server error' };
  return Response.json({ error: message }, { status });
}

/** The response for a server that is missing a setting, such as an environment variable. */
export function configErrorResponse(): Response {
  return Response.json({ error: errorResponses.config.error }, { status: 500 });
}
