'use client';

import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

import type { LegalTemplate } from '@/domain/legalTemplate';
import styles from '@/components/profiles/ProfileList.module.css';
import { deleteLegalTemplate } from './api';

type DeleteLegalTemplateButtonProps = {
  template: LegalTemplate;
  /** Called once the template is deleted. */
  onDeleted: (id: string) => void;
};

/** Deletes one of the counsellor's legal templates, after asking first. */
export function DeleteLegalTemplateButton({ template, onDeleted }: DeleteLegalTemplateButtonProps) {
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
      await deleteLegalTemplate(template.id);
      setOpen(false);
      onDeleted(template.id);
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
        aria-label={`Slett ${template.title}`}
      >
        Slett
      </Button>

      <Dialog open={open} onClose={close}>
        <DialogTitle>Slette lovverket «{template.title}»?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Lovverket blir borte for godt. Intervjuere du allerede har laget med det, blir som de
            er.
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
