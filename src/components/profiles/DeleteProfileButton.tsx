'use client';

import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

import type { JobSeekerProfile } from '@/domain/jobSeekerProfile';
import { deleteProfile } from './api';
import styles from './ProfileList.module.css';

type DeleteProfileButtonProps = {
  profile: JobSeekerProfile;
  /** Called once the profile is deleted. */
  onDeleted: (id: string) => void;
};

/** Deletes one of the counsellor's profiles, after asking first. */
export function DeleteProfileButton({ profile, onDeleted }: DeleteProfileButtonProps) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    // Closing while it deletes would hide whether it worked.
    if (deleting) return;
    setOpen(false);
    setError(null);
  }

  async function confirmDelete() {
    setDeleting(true);
    setError(null);
    try {
      await deleteProfile(profile.id);
      setOpen(false);
      onDeleted(profile.id);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Button
        size="small"
        color="error"
        onClick={() => setOpen(true)}
        aria-label={`Slett ${profile.label}`}
      >
        Slett
      </Button>

      <Dialog open={open} onClose={close}>
        <DialogTitle>Slette malen «{profile.label}»?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Malen blir borte for godt. Intervjuere du allerede har laget med den, blir som de er.
          </DialogContentText>
          {error && (
            <Alert severity="error" className={styles.dialogError}>
              {error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={close} disabled={deleting}>
            Avbryt
          </Button>
          <Button color="error" variant="contained" onClick={confirmDelete} disabled={deleting}>
            {deleting ? 'Sletter …' : 'Slett'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
