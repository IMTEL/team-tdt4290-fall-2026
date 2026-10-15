'use client';

import { useEffect, useState } from 'react';

import { DEFAULT_MODEL } from '@/domain/advancedSettings';

export type LanguageModels = {
  /** The models the counsellor can choose, always with the default and `currentModel`. */
  models: string[];
  /** True while the list from the server has not arrived. */
  loading: boolean;
  /** True if the list could not be loaded, so only the default and the current model are shown. */
  failed: boolean;
};

/** The language models RAGdoll offers, loaded from /api/models. */
export function useLanguageModels(currentModel: string = DEFAULT_MODEL): LanguageModels {
  const [state, setState] = useState<{ models: string[] | null; failed: boolean }>({
    models: null,
    failed: false,
  });

  useEffect(() => {
    let cancelled = false;
    fetchModels()
      .then((models) => {
        if (!cancelled) setState({ models, failed: false });
      })
      .catch(() => {
        if (!cancelled) setState({ models: null, failed: true });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    // The current model stays selectable even if IDUN no longer offers it.
    models: [...new Set([DEFAULT_MODEL, currentModel, ...(state.models ?? [])])],
    loading: state.models === null && !state.failed,
    failed: state.failed,
  };
}

async function fetchModels(): Promise<string[]> {
  const res = await fetch('/api/models', { cache: 'no-store' });
  if (!res.ok) throw new Error(`Could not load the language models: ${res.status}`);

  const data = await res.json().catch(() => null);
  if (!Array.isArray(data?.models) || !data.models.every((m: unknown) => typeof m === 'string')) {
    throw new Error('Invalid language models from the server');
  }
  return data.models;
}
