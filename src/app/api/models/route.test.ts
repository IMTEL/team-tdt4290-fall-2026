// @vitest-environment node
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_MODEL } from '@/domain/advancedSettings';
import { getSessionToken } from '@/lib/session-tokens';
import { listLanguageModels, RagdollError } from '@/server/ragdoll';
import { GET } from './route';

vi.mock('@/lib/session-tokens', () => ({ getSessionToken: vi.fn() }));
vi.mock('@/server/ragdoll', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/server/ragdoll')>();
  return { ...original, listLanguageModels: vi.fn() };
});

const getSessionTokenMock = vi.mocked(getSessionToken);
const listLanguageModelsMock = vi.mocked(listLanguageModels);

const request = () => new NextRequest('http://localhost/api/models');

beforeEach(() => {
  getSessionTokenMock.mockResolvedValue('session-token');
  vi.stubEnv('IDUN_API_KEY', 'idun-key');
  // The route logs problems on purpose; keep the test output clean.
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  getSessionTokenMock.mockReset();
  listLanguageModelsMock.mockReset();
});

describe('GET /api/models', () => {
  it('answers 401 when logged out, without asking RAGdoll', async () => {
    getSessionTokenMock.mockResolvedValue(null);

    const res = await GET(request());

    expect(res.status).toBe(401);
    expect(listLanguageModelsMock).not.toHaveBeenCalled();
  });

  it('lists the models RAGdoll offers, with the default first, asking with the IDUN key', async () => {
    listLanguageModelsMock.mockResolvedValue(['meta/llama-3.3-70b', DEFAULT_MODEL]);

    const res = await GET(request());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ models: [DEFAULT_MODEL, 'meta/llama-3.3-70b'] });
    expect(listLanguageModelsMock).toHaveBeenCalledWith('session-token', 'idun-key');
  });

  it('falls back to the default model when RAGdoll cannot list them', async () => {
    listLanguageModelsMock.mockRejectedValue(new RagdollError('unreachable', 'down'));

    const res = await GET(request());

    expect(await res.json()).toEqual({ models: [DEFAULT_MODEL] });
  });

  it('falls back to the default model when the IDUN key is missing', async () => {
    vi.stubEnv('IDUN_API_KEY', '');

    const res = await GET(request());

    expect(await res.json()).toEqual({ models: [DEFAULT_MODEL] });
    expect(listLanguageModelsMock).not.toHaveBeenCalled();
  });

  it('falls back to the default model when RAGdoll answers 401', async () => {
    // RAGdoll also answers 401 when IDUN rejects the project's key, so this is not a logout.
    listLanguageModelsMock.mockRejectedValue(new RagdollError('unauthorized', 'IDUN said 401'));

    const res = await GET(request());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ models: [DEFAULT_MODEL] });
  });
});
