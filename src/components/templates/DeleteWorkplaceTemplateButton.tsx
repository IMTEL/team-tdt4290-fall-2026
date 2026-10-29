'use client';

import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

import styles from './TemplatePicker.module.css';

type DeleteWorkplaceTemplateButtonProps = {
  /** The stillingsmal's or bransjemal's name. */
  name: string;
  /** «stillingsmalen» or «bransjemalen». */
  noun: string;
  /** Deletes it. Throws Error with a Norwegian message that can be shown as it is. */
  onDelete: () => Promise<void>;
  /** Called once it is deleted. */
  onDeleted: () => void;
  /** One more sentence for the dialog, about what else is or is not deleted. */
  note?: string;
};

/** Deletes one of the counsellor's stillingsmaler or bransjemaler, after asking first. */
export function DeleteWorkplaceTemplateButton({
  name,
  noun,
  onDelete,
  onDeleted,
  note,
}: DeleteWorkplaceTemplateButtonProps) {
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
      await onDelete();
      setOpen(false);
      onDeleted();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Button
        variant="outlined"
        color="error"
        onClick={() => setOpen(true)}
        aria-label={`Slett ${name}`}
      >
        Slett
      </Button>

      <Dialog open={open} onClose={close}>
        <DialogTitle>
          Slette {noun} «{name}»?
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Malen blir borte for godt. Intervjuere du allerede har laget med den, blir som de er.
            {note && ` ${note}`}
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
