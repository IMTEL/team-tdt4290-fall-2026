'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { notFound, useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';

import { fetchProfile } from '@/components/profiles/api';
import { DeleteProfileButton } from '@/components/profiles/DeleteProfileButton';
import {
  TemplateDetail,
  TemplateDetailPage,
  TemplateDetailSkeleton,
} from '@/components/templates/TemplateDetail';
import { EXPERIENCE_LEVELS, type JobSeekerProfile } from '@/domain/jobSeekerProfile';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; profile: JobSeekerProfile }
  | { kind: 'missing' }
  | { kind: 'error'; message: string };

/**
 * One of the counsellor's job seeker templates: everything it says about the job seeker, with the
 * buttons to edit and delete it. The notes are shown too, since only the counsellor sees this page.
 */
export function ProfileDetail({ profileId }: { profileId: string }) {
  const router = useRouter();
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    fetchProfile(profileId)
      .then((profile) => {
        if (!cancelled) setState(profile ? { kind: 'ready', profile } : { kind: 'missing' });
      })
      .catch((error: Error) => {
        if (!cancelled) setState({ kind: 'error', message: error.message });
      });
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  if (state.kind === 'missing') notFound();

  if (state.kind !== 'ready') {
    return (
      <TemplateDetailPage>
        {/* English translation: Loading job seeker template */}
        {state.kind === 'loading' && <TemplateDetailSkeleton label="Laster jobbsøkermal" />}
        {state.kind === 'error' && <Alert severity="error">{state.message}</Alert>}
      </TemplateDetailPage>
    );
  }

  const { profile } = state;
  return (
    <TemplateDetail
      title={profile.label}
      // English translation: Your own template
      chip="Egen mal"
      actions={
        <>
          <Button
            component={Link}
            href={`/profiles/${encodeURIComponent(profile.id)}/edit`}
            variant="outlined"
          >
            Rediger
          </Button>
          <DeleteProfileButton
            profile={profile}
            variant="outlined"
            onDeleted={() => router.push('/templates')}
          />
        </>
      }
      fields={[
        // English translation: Age group
        {
          label: 'Aldersgruppe',
          text: profile.ageRange ? `${profile.ageRange.replace('-', '–')} år` : '',
        },
        // English translation: Work experience
        {
          label: 'Arbeidserfaring',
          text: profile.experienceLevel ? EXPERIENCE_LEVELS[profile.experienceLevel] : '',
        },
        // English translation: What kind of experience?
        { label: 'Hva slags erfaring?', text: profile.workExperience },
        // English translation: Education
        { label: 'Utdanning', text: profile.education },
        // English translation: Languages
        { label: 'Språk', chips: profile.languages },
        // English translation: Wants to practise
        { label: 'Dette vil jobbsøkeren øve på', chips: profile.practiceAreas, boxed: true },
        // English translation: Notes, only for you
        { label: 'Notater (bare for deg)', text: profile.notes, boxed: true },
      ]}
    />
  );
}
