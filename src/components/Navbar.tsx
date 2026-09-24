'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bot } from 'lucide-react';

import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/ThemeToggle';
import styles from './Navbar.module.css';

// Add a route here and it shows up in the navbar with active highlighting.
// Only routes that actually exist belong in this list.
const NAV_LINKS: { href: string; label: string }[] = [{ href: '/', label: 'Home' }];

function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className={styles.header}>
      <nav className={styles.nav}>
        <Link href="/" className={styles.wordmark}>
          <Bot className={styles.wordmarkIcon} aria-hidden="true" />
          <span className={styles.wordmarkLong}>Interviewer Agent Configurator</span>
          <span className={styles.wordmarkShort}>IAC</span>
        </Link>

        <ul className={styles.links}>
          {NAV_LINKS.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(styles.link, active && styles.linkActive)}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <ThemeToggle />
      </nav>
    </header>
  );
}
