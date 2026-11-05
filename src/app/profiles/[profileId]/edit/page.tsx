import type { Metadata } from 'next';

import { returnPath } from '@/lib/returnTo';
import { EditProfile } from './EditProfile';

export const metadata: Metadata = {
  title: 'Rediger jobbsøkermal',
};

interface EditProfilePageProps {
  params: Promise<{ profileId: string }>;
  searchParams: Promise<{ returnTo?: string | string[] }>;
}

export default async function EditProfilePage({ params, searchParams }: EditProfilePageProps) {
  const { profileId } = await params;
  const { returnTo } = await searchParams;
  return <EditProfile profileId={profileId} cancelHref={returnPath(returnTo) ?? '/templates'} />;
}
