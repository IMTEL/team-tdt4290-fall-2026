import {
  isAgeRange,
  isExperienceLevel,
  type JobSeekerProfile,
  type NewJobSeekerProfile,
} from '@/domain/jobSeekerProfile';

const GENERIC_ERROR = 'Noe gikk galt. Prøv igjen.';

/** The Norwegian message for a failed request. Never the server's own text. */
function errorMessage(status: number): string {
  if (status === 401) return 'Du er logget ut. Logg inn på nytt og prøv igjen.';
  if (status === 400) return 'Profilen ble ikke godtatt. Sjekk feltene og prøv igjen.';
  if (status === 404) return 'Fant ikke profilen. Den kan ha blitt slettet.';
  if (status === 504) return 'Det tok for lang tid å få svar. Prøv igjen.';
  return GENERIC_ERROR;
}

/** Calls one of our profile routes. Throws Error with a Norwegian message if it can't. */
async function send(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (cause) {
    throw new Error('Fikk ikke kontakt med serveren. Sjekk nettverket og prøv igjen.', { cause });
  }
}

function withJson(method: 'POST' | 'PUT', profile: NewJobSeekerProfile): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  };
}

const profileUrl = (id: string) => `/api/profiles/${encodeURIComponent(id)}`;

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isProfile(value: unknown): value is JobSeekerProfile {
  if (typeof value !== 'object' || value === null) return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.id === 'string' &&
    typeof p.label === 'string' &&
    (p.ageRange === null || isAgeRange(p.ageRange)) &&
    (p.experienceLevel === null || isExperienceLevel(p.experienceLevel)) &&
    typeof p.workExperience === 'string' &&
    typeof p.education === 'string' &&
    isStringList(p.languages) &&
    isStringList(p.practiceAreas) &&
    typeof p.notes === 'string'
  );
}

/** The counsellor's profiles, most recently changed first. Throws Error with a Norwegian message. */
export async function fetchProfiles(signal?: AbortSignal): Promise<JobSeekerProfile[]> {
  const res = await send('/api/profiles', { cache: 'no-store', signal });
  if (!res.ok) throw new Error(errorMessage(res.status));

  const data = await res.json().catch(() => null);
  if (!Array.isArray(data?.profiles) || !data.profiles.every(isProfile)) {
    throw new Error(GENERIC_ERROR);
  }
  return data.profiles;
}

/**
 * One of the counsellor's profiles, or null if they have none with this id.
 * Throws Error with a Norwegian message for any other failure.
 */
export async function fetchProfile(id: string): Promise<JobSeekerProfile | null> {
  const res = await send(profileUrl(id), { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(errorMessage(res.status));

  const data = await res.json().catch(() => null);
  if (!isProfile(data?.profile)) throw new Error(GENERIC_ERROR);
  return data.profile;
}

/** Saves a new profile and returns its id. Throws Error with a Norwegian message. */
export async function saveProfile(profile: NewJobSeekerProfile): Promise<string> {
  const res = await send('/api/profiles', withJson('POST', profile));
  if (!res.ok) throw new Error(errorMessage(res.status));

  const data = await res.json().catch(() => null);
  if (typeof data?.profile?.id !== 'string') throw new Error(GENERIC_ERROR);
  return data.profile.id;
}

/** Saves changes to one of the counsellor's profiles. Throws Error with a Norwegian message. */
export async function updateProfile(id: string, profile: NewJobSeekerProfile): Promise<void> {
  const res = await send(profileUrl(id), withJson('PUT', profile));
  if (!res.ok) throw new Error(errorMessage(res.status));
}

/** Deletes one of the counsellor's profiles. Throws Error with a Norwegian message. */
export async function deleteProfile(id: string): Promise<void> {
  const res = await send(profileUrl(id), { method: 'DELETE' });
  if (!res.ok) throw new Error(errorMessage(res.status));
}
