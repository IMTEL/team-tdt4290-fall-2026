'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

import type { Agent } from '@/lib/types';
import { deleteAgent } from '../api';

export function DeleteAgentButton({ agent }: { agent: Agent }) {
  const router = useRouter();
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
      await deleteAgent(agent.id);
      router.push('/browse-agents');
    } catch (err) {
      setError((err as Error).message);
      setDeleting(false);
    }
  }

  return (
    <>
      <Button color="error" variant="outlined" onClick={() => setOpen(true)}>
        Slett
      </Button>

      <Dialog open={open} onClose={close}>
        <DialogTitle>Slette «{agent.name}»?</DialogTitle>
        <DialogContent>
          <DialogContentText>Agenten blir borte for godt. Dette kan ikke angres.</DialogContentText>
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
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
