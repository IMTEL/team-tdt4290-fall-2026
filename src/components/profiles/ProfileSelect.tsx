'use client';

import Link from 'next/link';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';

import { summarizeProfile, type JobSeekerProfile } from '@/domain/jobSeekerProfile';
import styles from './ProfileSelect.module.css';

type ProfileSelectProps = {
  profiles: JobSeekerProfile[];
  /** The chosen profile's id, or '' for none. */
  value: string;
  onChange: (profileId: string) => void;
};

/** Lets the counsellor choose one of their job seeker profiles, or none, before the chat. */
export function ProfileSelect({ profiles, value, onChange }: ProfileSelectProps) {
  return (
    <div className={styles.select}>
      <TextField
        select
        label="Jobbsøkerprofil"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        helperText="Profilen bestemmer hvem jobbsøkeren er. Uten profil spør assistenten deg om det."
        className={styles.field}
      >
        <MenuItem value="">Ingen profil</MenuItem>
        {profiles.map((profile) => {
          const summary = summarizeProfile(profile);
          return (
            <MenuItem key={profile.id} value={profile.id}>
              {summary ? `${profile.label} (${summary})` : profile.label}
            </MenuItem>
          );
        })}
      </TextField>
      <Link href="/profiles" className={styles.link}>
        Administrer profiler
      </Link>
    </div>
  );
}
