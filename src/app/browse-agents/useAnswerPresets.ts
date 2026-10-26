'use client';

import { useEffect, useState } from 'react';

import { fetchLegalTemplates } from '@/components/legalTemplates/api';
import { fetchProfiles } from '@/components/profiles/api';
import { builtInLegalTemplates } from '@/data/legal-templates';
import { builtInTemplates, type AgentTemplate } from '@/data/templates';
import type { AgentTypeDefinition } from '@/domain/agentTypes/types';
import {
  describeJobSeeker,
  summarizeProfile,
  type JobSeekerProfile,
} from '@/domain/jobSeekerProfile';
import type { LegalTemplate } from '@/domain/legalTemplate';
import { fetchSavedTemplates } from '../configure/api';
import type { AnswerPreset, LegalPreset } from './[agentId]/edit/EditAgentForm';

/**
 * The templates and job seeker profiles an interviewer's answers can be filled in from, the same
 * way the configure page uses them: the type's presets say which answer a template and a profile
 * fill in. A type without presets gets none.
 */
export function useAnswerPresets(definition: AgentTypeDefinition | undefined): AnswerPreset[] {
  // Null until loaded. Stays empty if loading fails.
  const [saved, setSaved] = useState<AgentTemplate[] | null>(null);
  const [profiles, setProfiles] = useState<JobSeekerProfile[] | null>(null);
  const agentType = definition?.id;
  const templateField = definition?.presets?.template?.field;
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
      fetchSavedTemplates(agentType!, controller.signal)
        .then(setSaved)
        .catch(failed(() => setSaved([])));
    }
    if (profileField) {
      fetchProfiles(controller.signal)
        .then(setProfiles)
        .catch(failed(() => setProfiles([])));
    }
    return () => controller.abort();
  }, [agentType, templateField, profileField]);

  const presets: AnswerPreset[] = [];
  if (templateField) {
    presets.push({
      field: templateField,
      kind: 'template',
      // The field's name and "mal", e.g. "Intervjuermal".
      label: `${definition!.fields.find(({ key }) => key === templateField)?.label ?? ''}mal`,
      loaded: saved !== null,
      options: [...builtInTemplates(agentType!), ...(saved ?? [])].map((template) => ({
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
      label: 'Jobbsøkermal',
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
      manageLabel: 'Administrer maler',
    });
  }
  return presets;
}

/**
 * The legal templates the type's legal field can be made from: the built-in ones first, then the
 * counsellor's own. Undefined for a type without a legal field.
 */
export function useLegalPreset(
  definition: AgentTypeDefinition | undefined,
): LegalPreset | undefined {
  // Null until loaded. Stays empty if loading fails, so the built-in ones can still be chosen.
  const [saved, setSaved] = useState<LegalTemplate[] | null>(null);
  const field = definition?.presets?.legalTemplates;

  useEffect(() => {
    if (!field) return;
    const controller = new AbortController();
    fetchLegalTemplates(controller.signal)
      .then(setSaved)
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.error(error);
        setSaved([]);
      });
    return () => controller.abort();
  }, [field]);

  if (!field) return undefined;
  return { field, options: [...builtInLegalTemplates, ...(saved ?? [])], loaded: saved !== null };
}
