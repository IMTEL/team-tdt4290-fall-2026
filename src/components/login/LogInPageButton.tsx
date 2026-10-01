'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { handleSignOut } from '@/lib/auth';
import { cn } from '@/lib/utils';
import navStyles from '../Navbar.module.css';
import styles from './LogInPageButton.module.css';

export default function LogInPageButton() {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  // Wait for the session, so a signed-in user does not see "Logg inn" flash by.
  if (status === 'loading') return null;

  if (session) {
    return (
      <>
        <span className={styles.userName}>{session.user?.name}</span>
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
