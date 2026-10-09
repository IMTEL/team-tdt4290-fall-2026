import type { Metadata } from 'next';

import { EditProfile } from './EditProfile';

export const metadata: Metadata = {
  title: 'Rediger jobbsøkerprofil',
};

interface EditProfilePageProps {
  params: Promise<{ profileId: string }>;
}

export default async function EditProfilePage({ params }: EditProfilePageProps) {
  const { profileId } = await params;
  return <EditProfile profileId={profileId} />;
}
