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
 * way the configure page uses them: a template gives the Intervjuer answer, a profile the
 * Jobbsøker answer. Other agent types get none.
 */
export function useAnswerPresets(definition: AgentTypeDefinition | undefined): AnswerPreset[] {
  const [saved, setSaved] = useState<InterviewerTemplate[]>([]);
  const [profiles, setProfiles] = useState<JobSeekerProfile[]>([]);
  const isInterviewer = definition?.id === 'interviewer';

  useEffect(() => {
    if (!isInterviewer) return;
    const controller = new AbortController();
    // Without the saved templates or profiles, the counsellor can still edit the text by hand.
    const logError = (error: unknown) => {
      if (!controller.signal.aborted) console.error(error);
    };
    fetchSavedTemplates(controller.signal).then(setSaved).catch(logError);
    fetchProfiles(controller.signal).then(setProfiles).catch(logError);
    return () => controller.abort();
  }, [isInterviewer]);

  if (!isInterviewer) return [];

  return [
    {
      field: 'intervjuer',
      label: 'Intervjuermal',
      options: [...interviewerTemplates, ...saved].map((template) => ({
        id: template.id,
        label: template.title,
        value: template.persona,
      })),
      manageHref: '/configure',
      manageLabel: 'Administrer maler',
    },
    {
      field: 'jobbsoker',
      label: 'Jobbsøkerprofil',
      options: profiles.map((profile) => {
        const summary = summarizeProfile(profile);
        return {
          id: profile.id,
          label: summary ? `${profile.label} (${summary})` : profile.label,
          value: describeJobSeeker(profile),
        };
      }),
      manageHref: '/profiles',
      manageLabel: 'Administrer profiler',
    },
  ];
}
