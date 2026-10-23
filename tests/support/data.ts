import { expect, type Page } from '@playwright/test';

// Creates test data through our own API, the same requests the forms send. The page must be
// logged in (see logIn in ./auth); page.request shares its login cookie. Use these when a test is
// about something else than making the data, so it doesn't click through a form first.

/** A finished interviewer configuration, as it is saved. Invented data. */
export const configuration = {
  stilling: 'Butikkmedarbeider',
  bransje: 'Varehandel',
  bedrift: 'En matbutikk',
  intervjutype: 'Førstegangsintervju',
  intervjuer: 'Vennlig butikksjef',
  jobbsoker: 'Har lite arbeidserfaring',
  vanskelighetsgrad: 'lett',
  egneSporsmal: 'Ingen',
};

/** Saves an interviewer through the agents API. Returns its id. */
export async function createAgent(
  page: Page,
  name: string,
  answers: Partial<typeof configuration> = {},
): Promise<string> {
  const res = await page.request.post('/api/agents', {
    data: { name, configuration: { ...configuration, ...answers } },
  });
  expect(res.status()).toBe(201);
  return (await res.json()).id;
}

/** Saves an interviewer template. Returns its id. */
export async function createTemplate(
  page: Page,
  template: { title: string; description?: string; focus?: string[]; persona?: string },
): Promise<string> {
  const res = await page.request.post('/api/templates', {
    data: {
      agentType: 'interviewer',
      description: 'En rolig og grundig intervjuer.',
      focus: ['Service'],
      persona: 'Intervjueren er butikksjef og spør om service og samarbeid.',
      ...template,
    },
  });
  expect(res.status()).toBe(201);
  return (await res.json()).template.id;
}

/** Saves a job seeker profile. Returns its id. */
export async function createProfile(
  page: Page,
  profile: { label: string; ageRange?: string; experienceLevel?: string; languages?: string[] },
): Promise<string> {
  const res = await page.request.post('/api/profiles', {
    data: {
      ageRange: null,
      experienceLevel: null,
      workExperience: '',
      education: '',
      languages: [],
      practiceAreas: [],
      notes: '',
      ...profile,
    },
  });
  expect(res.status()).toBe(201);
  return (await res.json()).profile.id;
}
