'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';

import cardStyles from '@/components/templates/TemplatePicker.module.css';
import {
  parseOtherPractice,
  PRACTICE_CHOICES,
  summarizeProfile,
  type JobSeekerProfile,
} from '@/domain/jobSeekerProfile';
import pageStyles from './page.module.css';
import { WizardFrame } from './StillingStep';
import stepStyles from './StillingStep.module.css';

type JobSeekerStepProps = {
  profiles: JobSeekerProfile[];
  loading: boolean;
  /** The agent-type line, same as on the interviewer step. */
  intro: ReactNode;
  onSelect: (profileId: string) => void;
  /** The chosen profile's id, '' for «Fortsett uten jobbsøkermal», or null until they choose. */
  selectedId: string | null;
  /** Practice areas chosen for this agent, using the stored profile texts as ids. */
  practiceAreas: string[];
  onPracticeChange: (areas: string[]) => void;
  /** True while the Andre field is open. */
  otherOpen: boolean;
  onOtherOpenChange: (open: boolean) => void;
  /** The Andre field, split on commas when the agent is saved. */
  otherPractice: string;
  onOtherPracticeChange: (text: string) => void;
  onNext: () => void;
  onBack: () => void;
  /** Opens an earlier section from the list on the side. */
  onGoTo?: (index: number) => void;
  reached?: number;
  onSaveDraft?: () => void;
};

/** The job seeker step, in the same frame as stilling and intervjuer. */
export function JobSeekerStep({
  profiles,
  loading,
  intro,
  onSelect,
  selectedId,
  practiceAreas,
  onPracticeChange,
  otherOpen,
  onOtherOpenChange,
  otherPractice,
  onOtherPracticeChange,
  onNext,
  onBack,
  onGoTo,
  reached,
  onSaveDraft,
}: JobSeekerStepProps) {
  return (
    <WizardFrame current={2} onGoTo={onGoTo} reached={reached} onSaveDraft={onSaveDraft}>
      <div className={stepStyles.form}>
        {intro}
        <section aria-labelledby="profile-picker-heading" className={cardStyles.picker}>
          <h2 id="profile-picker-heading" className={cardStyles.heading}>
            Velg en jobbsøkermal
          </h2>
          <p className={cardStyles.lead}>
            Malen bestemmer hvem jobbsøkeren er. Uten mal spør assistenten deg om det.
          </p>
          {loading ? (
            <p className={cardStyles.lead}>Laster maler …</p>
          ) : profiles.length === 0 ? (
            <p className={cardStyles.lead}>Du har ingen maler ennå.</p>
          ) : (
            // The group is around the list, so the cards are still a list and also radios.
            <div role="radiogroup" aria-labelledby="profile-picker-heading">
              <ul className={cardStyles.grid}>
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
            </div>
          )}
        </section>
        <div className={pageStyles.choiceActions}>
          <Button
            variant={selectedId === '' ? 'contained' : 'outlined'}
            aria-pressed={selectedId === ''}
            onClick={() => onSelect('')}
          >
            Fortsett uten jobbsøkermal
          </Button>
          <Button component={Link} href="/profiles/new" variant="outlined">
            Lag en ny jobbsøkermal
          </Button>
        </div>
        <div className={stepStyles.suggestions}>
          <p className={stepStyles.practiceHeading} id="practice-heading">
            Hva skal jobbsøkeren øve på?
            {practiceCount(practiceAreas, otherOpen, otherPractice) > 0 && (
              <span className={stepStyles.countBadge}>
                {practiceCount(practiceAreas, otherOpen, otherPractice)}
              </span>
            )}
          </p>
          <div className={stepStyles.pills} role="group" aria-labelledby="practice-heading">
            {PRACTICE_CHOICES.map((choice) => {
              const selected = practiceAreas.includes(choice.id);
              return (
                <Button
                  key={choice.id}
                  type="button"
                  size="small"
                  variant={selected ? 'contained' : 'outlined'}
                  aria-pressed={selected}
                  onClick={() =>
                    onPracticeChange(
                      selected
                        ? practiceAreas.filter((area) => area !== choice.id)
                        : [...practiceAreas, choice.id],
                    )
                  }
                >
                  {choice.label}
                </Button>
              );
            })}
            <Button
              type="button"
              size="small"
              variant={otherOpen ? 'contained' : 'outlined'}
              aria-pressed={otherOpen}
              aria-expanded={otherOpen}
              onClick={() => onOtherOpenChange(!otherOpen)}
            >
              Andre
            </Button>
          </div>
          {otherOpen && (
            <TextField
              label="Andre områder"
              value={otherPractice}
              onChange={(event) => onOtherPracticeChange(event.target.value)}
              fullWidth
              helperText="Skriv komma mellom hver ting."
              slotProps={{ formHelperText: { className: stepStyles.commaHint } }}
            />
          )}
          <p className={stepStyles.hint}>Gjelder denne agenten. Malen endres ikke.</p>
        </div>
        <div className={stepStyles.actions}>
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

function practiceCount(areas: string[], otherOpen: boolean, otherPractice: string): number {
  return areas.length + (otherOpen ? parseOtherPractice(otherPractice, areas).length : 0);
}
