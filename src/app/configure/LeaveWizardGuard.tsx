'use client';

import { useEffect, useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

import { DRAFT_SAVED_FLASH, setAgentsFlash } from '../browse-agents/flash';

/**
 * True when following `href` would leave the wizard. Round-trips with `returnTo` (new mal, edit
 * profile) come back, so they are allowed. Help is also allowed: the draft stays, and the
 * counsellor comes back with the browser.
 */
export function leavesWizard(href: string, origin: string): boolean {
  if (!href || href.startsWith('#') || href.toLowerCase().startsWith('javascript:')) return false;
  let url: URL;
  try {
    url = new URL(href, origin);
  } catch {
    return false;
  }
  if (url.origin !== new URL(origin).origin) return true;
  if (url.pathname === '/configure' || url.pathname.startsWith('/configure/')) return false;
  if (url.pathname === '/help' || url.pathname.startsWith('/help/')) return false;
  if (url.searchParams.has('returnTo')) return false;
  return true;
}

function pathFromAnchor(anchor: HTMLAnchorElement): string {
  return `${anchor.pathname}${anchor.search}${anchor.hash}`;
}

/**
 * Asks before a link takes the counsellor off the wizard without Lagre utkast. Closing the tab
 * gets the browser's own warning.
 */
export function LeaveWizardGuard() {
  const router = useRouter();
  const headingId = useId();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest('a');
      if (!(anchor instanceof HTMLAnchorElement) || !anchor.href) return;
      if (anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      if (!leavesWizard(anchor.href, window.location.origin)) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      setPendingHref(pathFromAnchor(anchor));
    }

    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = '';
    }

    document.addEventListener('click', onClick, true);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, []);

  function leave(href: string) {
    setPendingHref(null);
    router.push(href);
  }

  function confirmLeave() {
    if (pendingHref) leave(pendingHref);
  }

  function saveDraftAndLeave() {
    if (!pendingHref) return;
    setAgentsFlash(DRAFT_SAVED_FLASH);
    leave(pendingHref);
  }

  return (
    <Dialog
      open={pendingHref !== null}
      onClose={() => setPendingHref(null)}
      aria-labelledby={headingId}
    >
      <DialogTitle id={headingId}>Forlate uten å lagre?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Du er midt i å sette opp en intervjuer. Lagre utkastet hvis du vil fortsette senere, eller
          forlat uten å lagre.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setPendingHref(null)}>Avbryt</Button>
        <Button variant="outlined" onClick={saveDraftAndLeave}>
          Lagre utkast
        </Button>
        <Button variant="contained" onClick={confirmLeave}>
          Forlat
        </Button>
      </DialogActions>
    </Dialog>
  );
}
