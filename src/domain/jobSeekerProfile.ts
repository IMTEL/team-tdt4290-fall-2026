// Anonymous job seeker profiles. A counsellor describes a kind of job seeker once, and chooses the
// profile on /configure instead of answering the configurator's questions about the job seeker.
// Profiles never hold names or other data that identifies a person. They are stored in RAGdoll.

/** The age ranges RAGdoll accepts. */
export const AGE_RANGES = ['18-24', '25-29', '30-39', '40-49', '50-59', '60+'] as const;
export type AgeRange = (typeof AGE_RANGES)[number];

/** How much work experience the job seeker has, as RAGdoll stores it, with the Norwegian label. */
export const EXPERIENCE_LEVELS = {
  none: 'Ingen arbeidserfaring',
  little: 'Litt (under 1 år)',
  some: 'Noe (1–5 år)',
  extensive: 'Mye (over 5 år)',
} as const;
export type ExperienceLevel = keyof typeof EXPERIENCE_LEVELS;

/** Common things to practise. The counsellor can also write their own. */
export const PRACTICE_AREAS = [
  'Mestre nervøsitet',
  'Fortelle om seg selv',
  'Gi konkrete svar med eksempler',
  'Snakke om egne styrker og svakheter',
  'Forklare hull i CV-en',
  'Snakke norsk i intervju',
  'Stille spørsmål til arbeidsgiveren',
] as const;

/** The longest each field may be. The same limits as RAGdoll; the server checks them too. */
export const PROFILE_LIMITS = {
  label: 100,
  education: 500,
  workExperience: 1000,
  languages: 20,
  language: 50,
  practiceAreas: 20,
  practiceArea: 100,
  notes: 2000,
} as const;

export type JobSeekerProfile = {
  id: string;
  /** A short name for the counsellor, such as «Profil A». Never the job seeker's real name. */
  label: string;
  ageRange: AgeRange | null;
  experienceLevel: ExperienceLevel | null;
  /** The experience in the counsellor's words, such as «sommerjobb i butikk». */
  workExperience: string;
  education: string;
  /** Languages with a level if the counsellor gives one, such as «Norsk B1». */
  languages: string[];
  practiceAreas: string[];
  /** Only for the counsellor. Never sent to the configurator or the interviewer. */
  notes: string;
};

export type NewJobSeekerProfile = Omit<JobSeekerProfile, 'id'>;

export function isAgeRange(value: unknown): value is AgeRange {
  return AGE_RANGES.includes(value as AgeRange);
}

export function isExperienceLevel(value: unknown): value is ExperienceLevel {
  return typeof value === 'string' && Object.hasOwn(EXPERIENCE_LEVELS, value);
}

/**
 * The profile as one line for the Jobbsøker field of the configuration, in the same style the
 * configurator writes it. Leaves out empty fields and the counsellor's notes.
 */
export function describeJobSeeker(profile: NewJobSeekerProfile): string {
  const experience = [
    profile.experienceLevel && EXPERIENCE_LEVELS[profile.experienceLevel].toLowerCase(),
    profile.workExperience,
  ]
    .filter(Boolean)
    .join(', ');

  const parts = [
    profile.ageRange && `aldersgruppe ${profile.ageRange.replace('-', '–')} år`,
    experience && `arbeidserfaring: ${experience}`,
    profile.education && `utdanning: ${profile.education}`,
    profile.languages.length > 0 && `språk: ${profile.languages.join(', ')}`,
    profile.practiceAreas.length > 0 &&
      `vil øve på: ${profile.practiceAreas.map((area) => area.toLowerCase()).join(', ')}`,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join('; ') : 'ingen opplysninger om jobbsøkeren';
}

/** A short summary for the counsellor, such as «18–24 år · Litt (under 1 år)». */
export function summarizeProfile(profile: JobSeekerProfile): string {
  return [
    profile.ageRange && `${profile.ageRange.replace('-', '–')} år`,
    profile.experienceLevel && EXPERIENCE_LEVELS[profile.experienceLevel],
  ]
    .filter(Boolean)
    .join(' · ');
}
