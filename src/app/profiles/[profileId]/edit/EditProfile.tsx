'use client';

import { useEffect, useState } from 'react';
import { notFound, useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';

import { fetchProfile, updateProfile } from '@/components/profiles/api';
import { ProfileForm } from '@/components/profiles/ProfileForm';
import type { JobSeekerProfile } from '@/domain/jobSeekerProfile';
import { PROFILE_SAVED_FLASH, setTemplatesFlash } from '@/app/templates/flash';
import styles from '../../page.module.css';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; profile: JobSeekerProfile }
  | { kind: 'missing' }
  | { kind: 'error'; message: string };

/** Loads one of the counsellor's profiles and shows the form for editing it. */
export function EditProfile({ profileId }: { profileId: string }) {
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

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Rediger jobbsøkermal</h1>
        <p className={styles.lead}>
          {/* English translation: Changes apply to interviewers you set up from now on.
          Interviewers you have already saved stay as they are. */}
          Endringene gjelder intervjuere du setter opp fra nå av. Intervjuere du allerede har
          lagret, blir som de er.
        </p>
      </header>

      {state.kind === 'loading' && <p>Laster mal …</p>}
      {state.kind === 'error' && <Alert severity="error">{state.message}</Alert>}
      {state.kind === 'ready' && (
        <ProfileForm
          initial={state.profile}
          onSave={(profile) => updateProfile(profileId, profile)}
          onSaved={() => {
            setTemplatesFlash(PROFILE_SAVED_FLASH);
            router.push('/templates');
          }}
        />
      )}
    </div>
  );
}
