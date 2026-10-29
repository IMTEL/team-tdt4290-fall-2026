import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';
import styles from './ScrollArea.module.css';

/**
 * A box that scrolls when its content is taller than the height the caller's `className` gives it,
 * with a scrollbar that is always shown. Focusable, so it can be scrolled with the keyboard.
 */
export function ScrollArea({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn(styles.area, className)} tabIndex={0}>
      {children}
    </div>
  );
}
