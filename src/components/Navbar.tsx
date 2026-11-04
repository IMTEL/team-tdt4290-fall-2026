'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bot, CircleHelp } from 'lucide-react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/ThemeToggle';
import styles from './Navbar.module.css';
import LogInPageButton from './login/LogInPageButton';

// Add a route here and it shows up in the navbar with active highlighting.
// Only routes that actually exist belong in this list.
const NAV_LINKS: { href: string; label: string }[] = [
  { href: '/', label: 'Hjem' },
  { href: '/browse-agents', label: 'Agenter' },
  { href: '/templates', label: 'Maler' },
];

function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

export function Navbar() {
  const pathname = usePathname();
  const helpActive = isActive(pathname, '/help');

  return (
    <AppBar
      component="header"
      position="static"
      color="transparent"
      elevation={0}
      className={styles.header}
    >
      <Toolbar component="nav" disableGutters className={styles.nav}>
        <Link href="/" className={styles.wordmark}>
          <Bot className={styles.wordmarkIcon} aria-hidden="true" />
          <span className={styles.wordmarkLong}>Konfigurator for intervjuagenter</span>
          <span className={styles.wordmarkShort}>KFI</span>
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

        {/* Not in the links: a question mark on the right is where people look for help. Under
        40rem only the icon shows, so the link is named by aria-label. */}
        <Link
          href="/help"
          // English translation: Help
          aria-label="Hjelp"
          aria-current={helpActive ? 'page' : undefined}
          className={cn(styles.link, styles.help, helpActive && styles.linkActive)}
        >
          <CircleHelp className={styles.helpIcon} aria-hidden="true" />
          <span className={styles.helpText} aria-hidden="true">
            Hjelp
          </span>
        </Link>
        <ThemeToggle />
        <LogInPageButton />
      </Toolbar>
    </AppBar>
  );
}
