'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import styles from '../Navbar.module.css';

export default function LogInPageButton() {
    const pathname = usePathname();
    const active = pathname.startsWith('/login');

    return (
        <Link
            href="/login"
            aria-current={active ? 'page' : undefined}
            className={cn(styles.link, active && styles.linkActive)}
        >
            Log in
        </Link>
    );
}