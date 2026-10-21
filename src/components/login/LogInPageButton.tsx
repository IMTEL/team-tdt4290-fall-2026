'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { profileImageUrl } from '@/domain/counsellorProfile';
import { useCounsellorProfile } from '@/lib/counsellorProfileClient';
import { handleSignOut } from '@/lib/auth';
import { cn } from '@/lib/utils';
import navStyles from '../Navbar.module.css';
import styles from './LogInPageButton.module.css';

export default function LogInPageButton() {
  const pathname = usePathname();
  const { status, profile } = useCounsellorProfile();

  // Wait for the session, so a signed-in user does not see "Logg inn" flash by.
  if (status === 'loading') return null;

  if (status === 'authenticated') {
    return (
      <>
        <Link href="/profile" className={styles.profile}>
          <span
            className={styles.avatar}
            style={
              profileImageUrl(profile.image)
                ? { backgroundImage: `url("${profileImageUrl(profile.image)}")` }
                : undefined
            }
            aria-hidden="true"
          >
            {profileImageUrl(profile.image) ? null : initial(profile.name)}
          </span>
          <span className={styles.userName}>{profile.name}</span>
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          className={cn(navStyles.link, styles.logOutButton)}
        >
          Logg ut
        </button>
      </>
    );
  }

  const active = pathname.startsWith('/login');

  return (
    <Link
      href="/login"
      aria-current={active ? 'page' : undefined}
      className={cn(navStyles.link, active && navStyles.linkActive)}
    >
      Logg inn
    </Link>
  );
}

function initial(name: string): string {
  const letter = name.trim().charAt(0);
  return letter ? letter.toUpperCase() : '?';
}
