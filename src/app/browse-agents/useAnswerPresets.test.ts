import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchProfiles } from '@/components/profiles/api';
import { interviewerTemplates } from '@/data/interviewer-templates';
import { interviewer } from '@/domain/agentTypes/interviewer';
import type { AgentTypeDefinition } from '@/domain/agentTypes/types';
import { fetchSavedTemplates } from '../configure/api';
import { useAnswerPresets } from './useAnswerPresets';

vi.mock('@/components/profiles/api', () => ({ fetchProfiles: vi.fn() }));
vi.mock('../configure/api', () => ({ fetchSavedTemplates: vi.fn() }));

const fetchProfilesMock = vi.mocked(fetchProfiles);
const fetchSavedTemplatesMock = vi.mocked(fetchSavedTemplates);

const savedTemplate = {
  id: 'template-1',
  agentType: 'interviewer',
  title: 'Streng leder',
  description: 'Stiller vanskelige spørsmål',
  focus: [],
  persona: 'streng leder, kort i svarene',
};

const profile = {
  id: 'profile-1',
  label: 'Profil A',
  ageRange: '30-39' as const,
  experienceLevel: null,
  workExperience: '',
  education: '',
  languages: [],
  practiceAreas: [],
  notes: 'Bare for veilederen',
};

describe('useAnswerPresets', () => {
  afterEach(() => {
    fetchProfilesMock.mockReset();
    fetchSavedTemplatesMock.mockReset();
    vi.restoreAllMocks();
  });

  it('fills Intervjuer from every template and Jobbsøker from the profiles', async () => {
    fetchSavedTemplatesMock.mockResolvedValue([savedTemplate]);
    fetchProfilesMock.mockResolvedValue([profile]);

    const { result } = renderHook(() => useAnswerPresets(interviewer));

    await waitFor(() => expect(result.current[1].options).toHaveLength(1));
    const [templates, profiles] = result.current;

    expect(templates.field).toBe('intervjuer');
    expect(templates.options).toHaveLength(interviewerTemplates.length + 1);
    expect(templates.options.at(-1)).toEqual({
      id: 'template-1',
      label: 'Streng leder',
      value: 'streng leder, kort i svarene',
    });

    expect(profiles.field).toBe('jobbsoker');
    expect(profiles.options[0].label).toBe('Profil A (30–39 år)');
    expect(profiles.options[0].value).toContain('aldersgruppe 30–39 år');
    // The counsellor's notes never go into the agent.
    expect(profiles.options[0].value).not.toContain('Bare for veilederen');
  });

  it('still offers the built-in templates when loading fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchSavedTemplatesMock.mockRejectedValue(new Error('down'));
    fetchProfilesMock.mockRejectedValue(new Error('down'));

    const { result } = renderHook(() => useAnswerPresets(interviewer));

    await waitFor(() => expect(console.error).toHaveBeenCalledTimes(2));
    expect(result.current[0].options).toHaveLength(interviewerTemplates.length);
    expect(result.current[1].options).toEqual([]);
  });

  it('gives no presets for a type without any, and loads nothing', () => {
    const other: AgentTypeDefinition = { ...interviewer, id: 'other', presets: undefined };

    const { result } = renderHook(() => useAnswerPresets(other));

    expect(result.current).toEqual([]);
    expect(fetchProfilesMock).not.toHaveBeenCalled();
  });

  it('fills in the fields the type’s presets name, and loads only what it uses', async () => {
    const other: AgentTypeDefinition = {
      ...interviewer,
      id: 'other',
      presets: { jobSeekerProfile: 'stilling' },
    };
    fetchProfilesMock.mockResolvedValue([]);

    const { result } = renderHook(() => useAnswerPresets(other));

    expect(result.current.map(({ field, kind }) => ({ field, kind }))).toEqual([
      { field: 'stilling', kind: 'profile' },
    ]);
    await waitFor(() => expect(result.current[0].loaded).toBe(true));
    expect(fetchProfilesMock).toHaveBeenCalled();
    expect(fetchSavedTemplatesMock).not.toHaveBeenCalled();
  });
});
