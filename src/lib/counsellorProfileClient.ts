'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

import {
  profileFromSettings,
  settingsWithProfile,
  type CounsellorProfile,
} from '@/domain/counsellorProfile';

const listeners = new Set<(profile: CounsellorProfile) => void>();

/** Tells every open view, such as the navbar, that the profile was saved. */
export function publishCounsellorProfile(profile: CounsellorProfile) {
  listeners.forEach((listener) => listener(profile));
}

/**
 * Saves the profile into the counsellor's settings, keeping anything else stored there, and
 * updates the open views. Throws Error with a Norwegian message.
 */
export async function saveCounsellorProfile(profile: CounsellorProfile): Promise<void> {
  const current = await fetch('/api/user-settings')
    .then((res) => (res.ok ? res.json() : null))
    .catch(() => null);
  const res = await fetch('/api/user-settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ settings: settingsWithProfile(current?.settings, profile) }),
  });
  if (!res.ok) throw new Error('Profilen ble ikke lagret. Prøv igjen.');
  publishCounsellorProfile(profile);
}

/** The saved profile, or the name and email from the login until a profile is saved. */
export function useCounsellorProfile(): {
  status: 'loading' | 'authenticated' | 'unauthenticated';
  profile: CounsellorProfile;
} {
  const { data, status } = useSession();
  const name = data?.user?.name?.trim() ?? '';
  const email = data?.user?.email?.trim() ?? '';
  const [saved, setSaved] = useState<CounsellorProfile | null>(null);

  useEffect(() => {
    if (status !== 'authenticated') return;
    let cancelled = false;
    fetch('/api/user-settings')
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (!cancelled) setSaved(profileFromSettings(body?.settings, { name, email }));
      })
      .catch(() => {
        if (!cancelled) setSaved(profileFromSettings({}, { name, email }));
      });
    return () => {
      cancelled = true;
    };
  }, [status, name, email]);

  useEffect(() => subscribe(setSaved), []);

  return {
    status,
    profile: saved ?? { name, email, image: null },
  };
}

function subscribe(listener: (profile: CounsellorProfile) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
