import {
  isAgeRange,
  isExperienceLevel,
  PROFILE_LIMITS as LIMITS,
  type JobSeekerProfile,
  type NewJobSeekerProfile,
} from '@/domain/jobSeekerProfile';
import type { NewRagdollProfile, RagdollProfile } from './ragdoll';

/** The text without spaces at the ends, or null if it is not text or is too long. */
function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text.length <= max ? text : null;
}

/** The list with every item trimmed and empty items left out, or null if anything is invalid. */
function cleanList(value: unknown, maxItems: number, maxItem: number): string[] | null {
  if (!Array.isArray(value)) return null;
  const items = value.map((item) => cleanText(item, maxItem));
  if (items.some((item) => item === null)) return null;
  const kept = (items as string[]).filter(Boolean);
  return kept.length <= maxItems ? kept : null;
}

/**
 * The profile from a request body, with spaces trimmed. Null if the label is missing, a field is
 * too long, or a choice is not one we offer. Only these fields are kept, so the browser can't
 * store anything else in RAGdoll.
 */
export function parseNewProfile(body: unknown): NewJobSeekerProfile | null {
  if (typeof body !== 'object' || body === null) return null;
  const b = body as Record<string, unknown>;

  const label = cleanText(b.label, LIMITS.label);
  const workExperience = cleanText(b.workExperience ?? '', LIMITS.workExperience);
  const education = cleanText(b.education ?? '', LIMITS.education);
  const notes = cleanText(b.notes ?? '', LIMITS.notes);
  const languages = cleanList(b.languages ?? [], LIMITS.languages, LIMITS.language);
  const practiceAreas = cleanList(b.practiceAreas ?? [], LIMITS.practiceAreas, LIMITS.practiceArea);
  const ageRange = b.ageRange ?? null;
  const experienceLevel = b.experienceLevel ?? null;

  if (
    !label ||
    workExperience === null ||
    education === null ||
    notes === null ||
    languages === null ||
    practiceAreas === null ||
    (ageRange !== null && !isAgeRange(ageRange)) ||
    (experienceLevel !== null && !isExperienceLevel(experienceLevel))
  ) {
    return null;
  }

  return {
    label,
    ageRange,
    experienceLevel,
    workExperience,
    education,
    languages,
    practiceAreas,
    notes,
  };
}

/** The profile as we store it in RAGdoll. */
export function toRagdollProfile(profile: NewJobSeekerProfile): NewRagdollProfile {
  return {
    label: profile.label,
    age_range: profile.ageRange,
    experience_level: profile.experienceLevel,
    education: profile.education,
    work_experience: profile.workExperience,
    languages: profile.languages,
    practice_areas: profile.practiceAreas,
    notes: profile.notes,
  };
}

/** The profile from what RAGdoll stores. A choice we don't know is read as not given. */
export function fromRagdollProfile(stored: RagdollProfile): JobSeekerProfile {
  return {
    id: stored.id,
    label: stored.label,
    ageRange: isAgeRange(stored.age_range) ? stored.age_range : null,
    experienceLevel: isExperienceLevel(stored.experience_level) ? stored.experience_level : null,
    workExperience: stored.work_experience,
    education: stored.education,
    languages: stored.languages,
    practiceAreas: stored.practice_areas,
    notes: stored.notes,
  };
}
