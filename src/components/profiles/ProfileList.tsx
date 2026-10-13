'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';

import { summarizeProfile, type JobSeekerProfile } from '@/domain/jobSeekerProfile';
import { fetchProfiles } from './api';
import { DeleteProfileButton } from './DeleteProfileButton';
import styles from './ProfileList.module.css';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; profiles: JobSeekerProfile[] }
  | { kind: 'error'; message: string };

/** The counsellor's job seeker profiles, with links to edit them and buttons to delete them. */
export function ProfileList() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    fetchProfiles(controller.signal)
      .then((profiles) => setState({ kind: 'ready', profiles }))
      .catch((error: Error) => {
        if (!controller.signal.aborted) setState({ kind: 'error', message: error.message });
      });
    return () => controller.abort();
  }, []);

  if (state.kind === 'loading') return <p>Laster profiler …</p>;
  if (state.kind === 'error') return <Alert severity="error">{state.message}</Alert>;

  if (state.profiles.length === 0) {
    return (
      <p className={styles.empty}>
        Du har ingen profiler ennå. Lag en, så kan du velge den når du setter opp en intervjuer.
      </p>
    );
  }

  function removeProfile(id: string) {
    setState((current) =>
      current.kind === 'ready'
        ? { ...current, profiles: current.profiles.filter((profile) => profile.id !== id) }
        : current,
    );
  }

  return (
    <ul className={styles.grid}>
      {state.profiles.map((profile) => {
        const summary = summarizeProfile(profile);
        return (
          <li key={profile.id}>
            <Card variant="outlined" className={styles.card}>
              <CardContent className={styles.content}>
                <h2 className={styles.title}>{profile.label}</h2>
                {summary && <p className={styles.summary}>{summary}</p>}
                {profile.practiceAreas.length > 0 && (
                  <div className={styles.chips} aria-label="Vil øve på">
                    {profile.practiceAreas.map((area) => (
                      <Chip key={area} label={area} size="small" />
                    ))}
                  </div>
                )}
              </CardContent>
              <CardActions>
                <Button
                  component={Link}
                  href={`/profiles/${encodeURIComponent(profile.id)}/edit`}
                  size="small"
                  aria-label={`Rediger ${profile.label}`}
                >
                  Rediger
                </Button>
                <DeleteProfileButton profile={profile} onDeleted={removeProfile} />
              </CardActions>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
