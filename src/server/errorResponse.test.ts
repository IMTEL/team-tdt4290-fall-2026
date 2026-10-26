import { afterEach, describe, expect, it, vi } from 'vitest';

import { ragdollErrorResponse } from './errorResponse';
import { RagdollError } from './ragdoll';

describe('ragdollErrorResponse', () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

  afterEach(() => {
    consoleError.mockClear();
  });

  it('answers 404 for not found, without logging it as an error', async () => {
    const res = ragdollErrorResponse(new RagdollError('not-found', 'RAGdoll answered 404'));

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Not found' });
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('logs other RAGdoll failures', () => {
    const res = ragdollErrorResponse(new RagdollError('timeout', 'RAGdoll timed out'));

    expect(res.status).toBe(504);
    expect(consoleError).toHaveBeenCalled();
  });

  it('logs and answers 500 for errors that are not from RAGdoll', () => {
    const res = ragdollErrorResponse(new TypeError('a bug'));

    expect(res.status).toBe(500);
    expect(consoleError).toHaveBeenCalled();
  });
});
