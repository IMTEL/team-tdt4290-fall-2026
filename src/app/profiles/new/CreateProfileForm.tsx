'use client';

import { saveProfile } from '@/components/profiles/api';
import { ProfileForm } from '@/components/profiles/ProfileForm';

/** The profile form for a new profile. A client component, since it passes a function on. */
export function CreateProfileForm() {
  return (
    <ProfileForm
      onSave={async (profile) => {
        await saveProfile(profile);
      }}
    />
  );
}
