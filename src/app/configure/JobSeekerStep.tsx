'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardActions from '@mui/material/CardActions';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';

import { DeleteProfileButton } from '@/components/profiles/DeleteProfileButton';
import cardStyles from '@/components/templates/TemplatePicker.module.css';
import { FieldHelp } from '@/components/ui/FieldHelp';
import helpStyles from '@/components/ui/FieldHelp.module.css';
import { withReturnTo } from '@/lib/returnTo';
import {
  parseOtherPractice,
  practiceChoiceLabel,
  PRACTICE_CHOICES,
  summarizeProfile,
  type JobSeekerProfile,
} from '@/domain/jobSeekerProfile';
import pageStyles from './page.module.css';
import { ChoiceSummary, WizardFrame, WizardNav } from './StillingStep';
import type { TemplatePeek } from './templatePeeks';
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
  /** Called with the id of a profile once it is deleted. */
  onDeleted?: (id: string) => void;
  /** Where Rediger and Lag en ny jobbsøkermal send the counsellor back. */
  returnTo?: string;
  peeks?: TemplatePeek[];
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
  onDeleted = () => {},
  returnTo,
  peeks,
}: JobSeekerStepProps) {
  return (
    <WizardFrame current={2} onGoTo={onGoTo} reached={reached} peeks={peeks}>
      <div className={stepStyles.form}>
        {intro}
        <section aria-labelledby="profile-picker-heading" className={cardStyles.picker}>
          <div className={helpStyles.row}>
            <h2 id="profile-picker-heading" className={cardStyles.heading}>
              Velg en jobbsøkermal
            </h2>
            <FieldHelp
              label="Jobbsøkermal"
              description="En mal som beskriver en anonym jobbsøker. Uten mal blir du spurt om hvem jobbsøkeren er senere."
            />
          </div>
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
                        {/* Outside the action area: a button inside a button is not valid HTML. */}
                        <CardActions className={cardStyles.cardActions}>
                          <Button
                            component={Link}
                            href={withReturnTo(
                              `/profiles/${encodeURIComponent(profile.id)}/edit`,
                              returnTo,
                            )}
                            size="small"
                            className={cardStyles.edit}
                            aria-label={`Rediger ${profile.label}`}
                          >
                            Rediger
                          </Button>
                          <DeleteProfileButton profile={profile} onDeleted={onDeleted} />
                        </CardActions>
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
          <Button
            component={Link}
            href={withReturnTo('/profiles/new', returnTo)}
            variant="outlined"
          >
            Lag en ny jobbsøkermal
          </Button>
        </div>
        <div className={stepStyles.suggestions}>
          <div className={helpStyles.row}>
            <p className={stepStyles.practiceHeading} id="practice-heading">
              Hva skal jobbsøkeren øve på?
              {practiceCount(practiceAreas, otherOpen, otherPractice) > 0 && (
                <span className={stepStyles.countBadge}>
                  {practiceCount(practiceAreas, otherOpen, otherPractice)}
                </span>
              )}
            </p>
            <FieldHelp
              label="øvingsområder"
              description="Tema jobbsøkeren skal øve på i dette intervjuet. Gjelder bare denne agenten, ikke malen."
            />
          </div>
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
            <div className={stepStyles.fieldWithHelp}>
              <TextField
                label="Andre områder"
                value={otherPractice}
                onChange={(event) => onOtherPracticeChange(event.target.value)}
                fullWidth
                helperText="Skriv komma mellom hver ting."
                slotProps={{ formHelperText: { className: stepStyles.commaHint } }}
              />
              <FieldHelp
                label="Andre områder"
                description="Egne tema jobbsøkeren skal øve på, i tillegg til valgene over. Skill med komma."
              />
            </div>
          )}
          <p className={stepStyles.hint}>Gjelder denne agenten. Malen endres ikke.</p>
        </div>
        <ChoiceSummary
          lines={jobSeekerChoiceLines(
            profiles,
            selectedId,
            practiceAreas,
            otherOpen,
            otherPractice,
          )}
        />
        <WizardNav onBack={onBack} onNext={onNext} onSaveDraft={onSaveDraft} />
      </div>
    </WizardFrame>
  );
}

function practiceCount(areas: string[], otherOpen: boolean, otherPractice: string): number {
  return areas.length + (otherOpen ? parseOtherPractice(otherPractice, areas).length : 0);
}

function jobSeekerChoiceLines(
  profiles: JobSeekerProfile[],
  selectedId: string | null,
  practiceAreas: string[],
  otherOpen: boolean,
  otherPractice: string,
): { label: string; value: string }[] {
  const profileLabel =
    selectedId === ''
      ? 'Ingen mal er valgt, så intervjueren får ingen beskrivelse av jobbsøkeren.'
      : (profiles.find((profile) => profile.id === selectedId)?.label ?? '');
  const practice = [
    ...practiceAreas.map(practiceChoiceLabel),
    ...(otherOpen ? parseOtherPractice(otherPractice, practiceAreas) : []),
  ].join(', ');
  return [
    { label: 'Jobbsøkermal', value: profileLabel },
    { label: 'Øve på', value: practice },
  ];
}
