import type { Metadata } from 'next';

import { ProfileDetail } from './ProfileDetail';

export const metadata: Metadata = {
  title: 'Jobbsøkermal',
};

interface ProfileDetailPageProps {
  params: Promise<{ profileId: string }>;
}

export default async function ProfileDetailPage({ params }: ProfileDetailPageProps) {
  const { profileId } = await params;
  return <ProfileDetail profileId={profileId} />;
}
