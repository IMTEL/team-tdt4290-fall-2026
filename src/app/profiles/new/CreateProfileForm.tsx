'use client';

import { useRouter } from 'next/navigation';

import { saveProfile } from '@/components/profiles/api';
import { ProfileForm } from '@/components/profiles/ProfileForm';
import { PROFILE_CREATED_FLASH, setTemplatesFlash } from '@/app/templates/flash';

/** The profile form for a new profile. A client component, since it passes a function on. */
export function CreateProfileForm() {
  const router = useRouter();

  return (
    <ProfileForm
      onSave={async (profile) => {
        await saveProfile(profile);
      }}
      onSaved={() => {
        setTemplatesFlash(PROFILE_CREATED_FLASH);
        router.push('/templates');
      }}
    />
  );
}
