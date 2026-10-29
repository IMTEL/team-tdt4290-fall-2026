'use client';

import { useEffect, useState } from 'react';

import { industryTemplates, type IndustryTemplate } from '@/data/industry-templates';
import type { IndustryTemplateEntry } from '@/domain/workplaceTemplate';
import { fetchIndustryTemplates, fetchJobTemplates } from './workplaceApi';

export type WorkplaceTemplates = {
  /** The counsellor's stillingsmaler first, then the built-in ones. */
  jobs: IndustryTemplate[];
  /** The bransjemaler the counsellor has added. */
  industries: IndustryTemplateEntry[];
  /** False until the counsellor's own have loaded, or failed to. */
  loaded: boolean;
  /** A Norwegian message if the counsellor's own could not be loaded. The built-in ones still are. */
  error: string | null;
};

/**
 * The stillingsmaler and bransjemaler the counsellor can choose from: their own and the built-in
 * ones. The built-in ones are there at once; the counsellor's own come when they have loaded.
 */
export function useWorkplaceTemplates(enabled = true): WorkplaceTemplates {
  const [saved, setSaved] = useState<{
    jobs: IndustryTemplate[];
    industries: IndustryTemplateEntry[];
    loaded: boolean;
    error: string | null;
  }>({ jobs: [], industries: [], loaded: false, error: null });

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    Promise.all([fetchJobTemplates(controller.signal), fetchIndustryTemplates(controller.signal)])
      .then(([jobs, industries]) => {
        if (!controller.signal.aborted) setSaved({ jobs, industries, loaded: true, error: null });
      })
      .catch((error: Error) => {
        if (!controller.signal.aborted) {
          setSaved({ jobs: [], industries: [], loaded: true, error: error.message });
        }
      });
    return () => controller.abort();
  }, [enabled]);

  return {
    jobs: [...saved.jobs, ...industryTemplates],
    industries: saved.industries,
    loaded: saved.loaded,
    error: saved.error,
  };
}
