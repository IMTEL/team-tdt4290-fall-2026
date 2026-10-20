import { findIndustryTemplate } from '@/data/industry-templates';
import type { AgentTemplate } from '@/data/templates';
import { MAX_NAME_LENGTH } from '@/domain/agentName';
import type { Configuration } from '@/domain/configuration';
import type { AnswerSources } from '@/domain/agentTypes/types';
import {
  describeJobSeeker,
  isPracticeChoice,
  PRACTICE_CHOICES,
  type JobSeekerProfile,
} from '@/domain/jobSeekerProfile';
import { describeLegalFrameworks, type LegalTemplate } from '@/domain/legalTemplate';
import type { InterviewSettings } from './SettingsStep';
import { NO_TEMPLATE, type Workplace } from './StillingStep';

/** What the last step has decided, in the shape the wizard keeps it. */
export type WizardDraft = {
  workplace: Workplace;
  /** The interviewer template, or null when the counsellor continued without one. */
  interviewer: AgentTemplate | null;
  /** The job seeker profile, or null when the counsellor continued without one. */
  profile: JobSeekerProfile | null;
  /** Practice areas for this agent. Ids are the texts stored on a profile. */
  practiceAreas: string[];
  /** The legal templates the interviewer must follow, in the order they were chosen. */
  legalTemplates: LegalTemplate[];
  settings: InterviewSettings;
};

export type WizardConfiguration = {
  answers: Configuration;
  sources: AnswerSources;
};

/** The name offered on the last step, from the job title the counsellor wrote. */
export function suggestedAgentName(jobTitle: string): string {
  const title = jobTitle.trim();
  const name = title ? `Intervjuer for ${title}` : 'Intervjuer';
  return name.slice(0, MAX_NAME_LENGTH);
}

/**
 * The wizard's choices as the texts an interviewer is saved as, plus the template and
 * profile those texts came from. Returns null when a required choice is missing, so a half
 * filled wizard is not saved. Skipped choices become a short sentence, because every answer
 * except Tillegg has to contain text.
 */
export function wizardConfiguration(draft: WizardDraft): WizardConfiguration | null {
  const { workplace, settings } = draft;
  const count = questionCount(settings);
  if (workplace.jobTitle.trim() === '' || workplace.sector === null || count === null) return null;
  if (!settings.interviewType || !settings.difficulty || !settings.followUp) return null;
  if (workplace.templateId === null || workplace.industry === '') return null;

  const sources: AnswerSources = {};
  if (draft.interviewer) {
    sources.intervjuer = { kind: 'template', id: draft.interviewer.id };
  }
  if (draft.profile) sources.jobbsoker = { kind: 'profile', id: draft.profile.id };

  return {
    answers: {
      stilling: stillingOf(workplace),
      bransje: bransjeOf(workplace),
      bedrift: workplace.company.trim() || 'ikke oppgitt',
      intervjutype: settings.interviewType,
      intervjuer: draft.interviewer?.persona ?? 'Ingen mal',
      jobbsoker: jobSeekerOf(draft.profile, draft.practiceAreas),
      vanskelighetsgrad: `${settings.difficulty} | Antall spørsmål: ${count} | Oppfølgingsspørsmål: ${settings.followUp}`,
      egneSporsmal: settings.ownQuestions.trim() || 'ingen',
      tillegg: settings.extra.trim(),
      lovverk: describeLegalFrameworks(draft.legalTemplates),
    },
    sources,
  };
}

/** The profile's description, with the areas chosen for this agent instead of the profile's own. */
function jobSeekerOf(profile: JobSeekerProfile | null, practiceAreas: string[]): string {
  const chosen = PRACTICE_CHOICES.map((choice) => choice.id).filter((id) =>
    practiceAreas.includes(id),
  );
  const custom = practiceAreas.filter((area) => !isPracticeChoice(area));
  const areas = [...chosen, ...custom];
  if (profile) return describeJobSeeker({ ...profile, practiceAreas: areas });
  if (areas.length === 0) return 'ingen opplysninger om jobbsøkeren';
  return `vil øve på: ${areas.map((area) => area.toLowerCase()).join(', ')}`;
}

/** The job title, with the stillingsmal's description after it when one was chosen. */
function stillingOf(workplace: Workplace): string {
  const title = workplace.jobTitle.trim();
  const template =
    workplace.templateId && workplace.templateId !== NO_TEMPLATE
      ? findIndustryTemplate(workplace.templateId)
      : undefined;
  return template ? `${title}. ${template.jobDescription}` : title;
}

/** Industry and employer in the one line the saved Bransje field uses. */
function bransjeOf(workplace: Workplace): string {
  const industry =
    workplace.industry === NO_TEMPLATE || workplace.industry.trim() === ''
      ? 'Ingen bransje'
      : workplace.industry.trim();
  const sector =
    workplace.sector === 'offentlig' || workplace.sector === 'privat'
      ? workplace.sector
      : 'ikke oppgitt';
  return `${industry} (${sector})`;
}

/** The range, or the number written for 10+. Null when that choice is not finished. */
function questionCount(settings: InterviewSettings): string | null {
  if (settings.questionCount === null) return null;
  if (settings.questionCount !== '10+') return settings.questionCount;
  const detail = settings.questionCountDetail.trim();
  return detail === '' ? null : detail;
}
