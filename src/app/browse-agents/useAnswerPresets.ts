'use client';

import { useEffect, useState } from 'react';

import { fetchProfiles } from '@/components/profiles/api';
import { interviewerTemplates, type InterviewerTemplate } from '@/data/interviewer-templates';
import type { AgentTypeDefinition } from '@/domain/agentTypes/types';
import {
  describeJobSeeker,
  summarizeProfile,
  type JobSeekerProfile,
} from '@/domain/jobSeekerProfile';
import { fetchSavedTemplates } from '../configure/api';
import type { AnswerPreset } from './[agentId]/edit/EditAgentForm';

/**
 * The templates and job seeker profiles an interviewer's answers can be filled in from, the same
 * way the configure page uses them: the type's presets say which answer a template and a profile
 * fill in. A type without presets gets none.
 */
export function useAnswerPresets(definition: AgentTypeDefinition | undefined): AnswerPreset[] {
  // Null until loaded. Stays empty if loading fails.
  const [saved, setSaved] = useState<InterviewerTemplate[] | null>(null);
  const [profiles, setProfiles] = useState<JobSeekerProfile[] | null>(null);
  const templateField = definition?.presets?.interviewerTemplate;
  const profileField = definition?.presets?.jobSeekerProfile;

  useEffect(() => {
    if (!templateField && !profileField) return;
    const controller = new AbortController();
    // Without the saved templates or profiles, the counsellor can still edit the text by hand.
    const failed = (setEmpty: () => void) => (error: unknown) => {
      if (controller.signal.aborted) return;
      console.error(error);
      setEmpty();
    };
    if (templateField) {
      fetchSavedTemplates(controller.signal)
        .then(setSaved)
        .catch(failed(() => setSaved([])));
    }
    if (profileField) {
      fetchProfiles(controller.signal)
        .then(setProfiles)
        .catch(failed(() => setProfiles([])));
    }
    return () => controller.abort();
  }, [templateField, profileField]);

  const presets: AnswerPreset[] = [];
  if (templateField) {
    presets.push({
      field: templateField,
      kind: 'template',
      label: 'Intervjuermal',
      loaded: saved !== null,
      options: [...interviewerTemplates, ...(saved ?? [])].map((template) => ({
        id: template.id,
        label: template.title,
        value: template.persona,
      })),
      manageHref: '/configure',
      manageLabel: 'Administrer maler',
    });
  }
  if (profileField) {
    presets.push({
      field: profileField,
      kind: 'profile',
      label: 'Jobbsøkerprofil',
      loaded: profiles !== null,
      options: (profiles ?? []).map((profile) => {
        const summary = summarizeProfile(profile);
        return {
          id: profile.id,
          label: summary ? `${profile.label} (${summary})` : profile.label,
          value: describeJobSeeker(profile),
        };
      }),
      manageHref: '/profiles',
      manageLabel: 'Administrer profiler',
    });
  }
  return presets;
}
