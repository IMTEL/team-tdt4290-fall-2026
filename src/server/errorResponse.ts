import { RagdollError, type RagdollErrorKind } from './ragdoll';

// What the browser gets for each RAGdoll failure. Never RAGdoll's own message.
const errorResponses: Record<RagdollErrorKind, { status: number; error: string }> = {
  config: { status: 500, error: 'Server configuration error' },
  timeout: { status: 504, error: 'Request to RAGdoll API timed out' },
  unreachable: { status: 502, error: 'Error from RAGdoll API' },
  'bad-response': { status: 502, error: 'Invalid response from RAGdoll API' },
  unauthorized: { status: 401, error: 'Not signed in' },
};

/** Turns an error from talking to RAGdoll into a safe response for the browser, and logs it. */
export function ragdollErrorResponse(error: unknown): Response {
  console.error('Error talking to RAGdoll:', error);
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
