'use client';

import { useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Stepper from '@mui/material/Stepper';

import { fetchProfiles } from '@/components/profiles/api';
import { ProfileSelect } from '@/components/profiles/ProfileSelect';
import { IndustryPicker } from '@/components/templates/IndustryPicker';
import { IndustryPreview } from '@/components/templates/IndustryPreview';
import { TemplatePicker } from '@/components/templates/TemplatePicker';
import { industryTemplates, type IndustryTemplate } from '@/data/industry-templates';
import { interviewerTemplates, type InterviewerTemplate } from '@/data/interviewer-templates';
import type { JobSeekerProfile } from '@/domain/jobSeekerProfile';
import { fetchSavedTemplates } from './api';
import { ConfigurationChat } from './ConfigurationChat';
import styles from './page.module.css';

// undefined: the counsellor hasn't chosen yet. null: they chose to continue without a template.
type Choice<T> = T | null | undefined;

const STEPS = ['Velg intervjuer og profil', 'Velg bransje', 'Svar på spørsmålene'];

/** Shows where the counsellor is, so they know the industry comes after the interviewer. */
function Steps({ active }: { active: number }) {
  return (
    <Stepper activeStep={active} alternativeLabel className={styles.steps}>
      {STEPS.map((label, index) => (
        <Step key={label} aria-current={index === active ? 'step' : undefined}>
          <StepLabel>{label}</StepLabel>
        </Step>
      ))}
    </Stepper>
  );
}

/**
 * First the counsellor picks a job seeker profile, which decides the job seeker, and an interviewer
 * template, which decides the interviewer. Both are optional. The built-in templates come first,
 * then the ones the counsellor has saved. Then they pick an industry template, which decides the
 * job and industry, or continue without one. Then the chat starts.
 */
export function ConfigureInterviewer() {
  const [choice, setChoice] = useState<Choice<InterviewerTemplate>>(undefined);
  const [industry, setIndustry] = useState<Choice<IndustryTemplate>>(undefined);
  const [saved, setSaved] = useState<InterviewerTemplate[]>([]);
  const [profiles, setProfiles] = useState<JobSeekerProfile[]>([]);
  const [profileId, setProfileId] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    // Without the saved templates or profiles, the counsellor can still go on without them.
    const logError = (error: unknown) => {
      if (!controller.signal.aborted) console.error(error);
    };
    fetchSavedTemplates(controller.signal).then(setSaved).catch(logError);
    fetchProfiles(controller.signal).then(setProfiles).catch(logError);
    return () => controller.abort();
  }, []);

  const profile = profiles.find((item) => item.id === profileId) ?? null;

  const chosenIndustry = (
    <div className={styles.chosen}>
      <p>
        Stilling: <strong>{industry ? industry.title : 'Ingen bransjemal valgt'}</strong>
      </p>
      <Button variant="contained" size="small" onClick={() => setIndustry(undefined)}>
        {industry ? 'Bytt bransjemal' : 'Velg en bransjemal'}
      </Button>
    </div>
  );

  if (choice === undefined) {
    return (
      <>
        <Steps active={0} />
        {/* Kept when the counsellor goes back to change the interviewer. */}
        {industry !== undefined && chosenIndustry}
        <ProfileSelect profiles={profiles} value={profileId} onChange={setProfileId} />
        <TemplatePicker
          templates={interviewerTemplates}
          savedTemplates={saved}
          onSelect={setChoice}
          onDeleted={(id) =>
            setSaved((current) => current.filter((template) => template.id !== id))
          }
        />
        {industry === undefined && <IndustryPreview templates={industryTemplates} />}
      </>
    );
  }

  // Shown above the industry picker and the chat, so the counsellor can go back and change it.
  const chosenInterviewer = (
    <div className={styles.chosen}>
      <p>
        Intervjuer: <strong>{choice ? choice.title : 'Ingen mal valgt'}</strong>
        <br />
        Jobbsøker: <strong>{profile ? profile.label : 'Ingen profil valgt'}</strong>
      </p>
      {/* Changing the choices starts the conversation over, since the chat was set up for them. */}
      <Button variant="contained" size="small" onClick={() => setChoice(undefined)}>
        Bytt mal eller profil
      </Button>
    </div>
  );

  if (industry === undefined) {
    return (
      <>
        <Steps active={1} />
        {chosenInterviewer}
        <IndustryPicker templates={industryTemplates} onSelect={setIndustry} />
      </>
    );
  }

  return (
    <>
      <Steps active={2} />
      {chosenInterviewer}
      {chosenIndustry}
      <ConfigurationChat
        key={`${choice?.id ?? 'none'}:${profile?.id ?? 'none'}:${industry?.id ?? 'none'}`}
        template={choice}
        profile={profile}
        industry={industry}
      />
    </>
  );
}
