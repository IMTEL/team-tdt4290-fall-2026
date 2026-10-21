'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import Chip from '@mui/material/Chip';

import cardStyles from '@/components/templates/TemplatePicker.module.css';
import { summarizeProfile, type JobSeekerProfile } from '@/domain/jobSeekerProfile';
import pageStyles from './page.module.css';
import { WizardFrame } from './StillingStep';
import stepStyles from './StillingStep.module.css';

type JobSeekerStepProps = {
  profiles: JobSeekerProfile[];
  loading: boolean;
  /** The agent-type line, same as on the interviewer step. */
  intro: ReactNode;
  onSelect: (profileId: string) => void;
  /** The chosen profile's id, or '' when none is chosen. */
  selectedId: string;
  onNext: () => void;
  onBack: () => void;
  /** Opens an earlier section from the list on the side. */
  onGoTo?: (index: number) => void;
  reached?: number;
};

/** The job seeker step, in the same frame as stilling and intervjuer. */
export function JobSeekerStep({
  profiles,
  loading,
  intro,
  onSelect,
  selectedId,
  onNext,
  onBack,
  onGoTo,
  reached,
}: JobSeekerStepProps) {
  return (
    <WizardFrame current={2} onGoTo={onGoTo} reached={reached}>
      <div className={stepStyles.form}>
        {intro}
        <section aria-labelledby="profile-picker-heading" className={cardStyles.picker}>
          <h2 id="profile-picker-heading" className={cardStyles.heading}>
            Velg en jobbsøkerprofil
          </h2>
          <p className={cardStyles.lead}>
            Profilen bestemmer hvem jobbsøkeren er. Uten profil spør assistenten deg om det.
          </p>
          {loading ? (
            <p className={cardStyles.lead}>Laster profiler …</p>
          ) : profiles.length === 0 ? (
            <p className={cardStyles.lead}>Du har ingen profiler ennå.</p>
          ) : (
            <ul
              className={cardStyles.grid}
              role="radiogroup"
              aria-labelledby="profile-picker-heading"
            >
              {profiles.map((profile) => {
                const summary = summarizeProfile(profile);
                const selected = selectedId === profile.id;
                return (
                  <li key={profile.id}>
                    <Card
                      variant="outlined"
                      className={
                        selected ? `${cardStyles.card} ${cardStyles.chosen}` : cardStyles.card
                      }
                    >
                      <CardActionArea
                        onClick={() => onSelect(profile.id)}
                        className={cardStyles.action}
                        role="radio"
                        aria-checked={selected}
                      >
                        <h3 className={cardStyles.title}>{profile.label}</h3>
                        {summary && <p className={cardStyles.description}>{summary}</p>}
                        {profile.practiceAreas.length > 0 && (
                          <div className={cardStyles.focus}>
                            {profile.practiceAreas.map((area) => (
                              <Chip key={area} label={area} size="small" />
                            ))}
                          </div>
                        )}
                      </CardActionArea>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        <div className={pageStyles.presetActions}>
          <Button variant="outlined" onClick={() => onSelect('')}>
            Fortsett uten profil
          </Button>
          <Button component={Link} href="/profiles/new" variant="outlined">
            Lag en ny profil
          </Button>
          <div className={stepStyles.nav}>
            <Button onClick={onBack}>Tilbake</Button>
            <Button variant="contained" onClick={onNext}>
              Neste
            </Button>
          </div>
        </div>
      </div>
    </WizardFrame>
  );
}
