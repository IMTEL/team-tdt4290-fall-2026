/**
 * Thin client for the backend (RAGdoll). Requests go to our own Next.js proxy at
 * `/api/backend/*` (see src/app/api/backend/[...path]/route.ts), which adds the signed-in
 * user's session token and forwards them to RAGdoll. Call it from the browser.
 */

export const API_BASE_URL = '/api/backend';

/** Thrown when the backend answers with a non-2xx status. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly statusText: string,
    readonly body: string,
  ) {
    super(`Request failed with ${status} ${statusText}`);
    this.name = 'ApiError';
  }
}

/** Thrown when the backend cannot be reached at all. */
export class ApiUnreachableError extends Error {
  constructor(
    readonly url: string,
    options?: { cause?: unknown },
  ) {
    super(`Could not reach the backend at ${url}`);
    this.name = 'ApiUnreachableError';
    if (options?.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}

/**
 * Fetch `path` from the backend and parse the response as JSON.
 *
 * @param path Path relative to the RAGdoll root, e.g. `/agents/`.
 */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    });
  } catch (cause) {
    throw new ApiUnreachableError(url, { cause });
  }

  if (!response.ok) {
    throw new ApiError(response.status, response.statusText, await response.text());
  }

  return (await response.json()) as T;
}
