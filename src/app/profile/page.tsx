import type { Metadata } from 'next';

import { ProfileHome } from './ProfileHome';

export const metadata: Metadata = {
  title: 'Min profil',
  description: 'Agentene dine, malene du har laget og kontoen din på ett sted.',
};

export default function ProfilePage() {
  return <ProfileHome />;
}
