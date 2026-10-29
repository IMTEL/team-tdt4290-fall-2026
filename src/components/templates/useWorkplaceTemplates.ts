'use client';

import { useEffect, useState } from 'react';

import { industryTemplates, type IndustryTemplate } from '@/data/industry-templates';
import { fetchJobTemplates } from './workplaceApi';

export type WorkplaceTemplates = {
  /** The counsellor's stillingsmaler first, then the built-in ones. */
  jobs: IndustryTemplate[];
  /** False until the counsellor's own have loaded, or failed to. */
  loaded: boolean;
  /** A Norwegian message if the counsellor's own could not be loaded. The built-in ones still are. */
  error: string | null;
};

/**
 * The stillingsmaler the counsellor can choose from: their own and the built-in ones. The built-in
 * ones are there at once; the counsellor's own come when they have loaded.
 */
export function useWorkplaceTemplates(enabled = true): WorkplaceTemplates {
  const [saved, setSaved] = useState<{
    jobs: IndustryTemplate[];
    loaded: boolean;
    error: string | null;
  }>({ jobs: [], loaded: false, error: null });

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    fetchJobTemplates(controller.signal)
      .then((jobs) => {
        if (!controller.signal.aborted) setSaved({ jobs, loaded: true, error: null });
      })
      .catch((error: Error) => {
        if (!controller.signal.aborted) setSaved({ jobs: [], loaded: true, error: error.message });
      });
    return () => controller.abort();
  }, [enabled]);

  return {
    jobs: [...saved.jobs, ...industryTemplates],
    loaded: saved.loaded,
    error: saved.error,
  };
}
