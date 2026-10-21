'use client';

import { useState, type FormEvent } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';

import { MAX_NAME_LENGTH } from '@/domain/agentName';
import { MAX_PUBLIC_DESCRIPTION_LENGTH } from '@/domain/publication';
import type { Agent } from '@/lib/types';
import { publishAgent, unpublishAgent, type Publication } from '../api';

type Props = {
  agent: Agent;
  publication: Publication;
  onChange: (publication: Publication) => void;
};

/**
 * "Publiser" makes the agent available in The Candidate, with a name and short description.
 * When it is published, "Gjem agent" hides it again.
 */
export function PublishAgentButton({ agent, publication, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A hidden agent keeps its text, so publishing again starts from it.
  const [name, setName] = useState(publication.publicName || agent.name);
  const [description, setDescription] = useState(publication.publicDescription);

  const nameMissing = name.trim() === '';

  function close() {
    // Closing while it sends would hide whether it worked.
    if (sending) return;
    setOpen(false);
    setError(null);
  }

  async function send(action: () => Promise<Publication>) {
    setSending(true);
    setError(null);
    try {
      onChange(await action());
      setOpen(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  function submitPublish(event: FormEvent) {
    event.preventDefault();
    if (nameMissing) return;
    send(() => publishAgent(agent.id, name.trim(), description.trim()));
  }

  if (publication.isPublished) {
    return (
      <>
        <Button variant="outlined" onClick={() => setOpen(true)}>
          Gjem agent
        </Button>

        <Dialog open={open} onClose={close}>
          <DialogTitle>Gjemme «{publication.publicName}»?</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Agenten blir borte fra The Candidate med en gang. Du kan publisere den igjen senere.
            </DialogContentText>
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={close} disabled={sending}>
              Avbryt
            </Button>
            <Button
              variant="contained"
              onClick={() => send(() => unpublishAgent(agent.id))}
              disabled={sending}
            >
              {sending ? 'Gjemmer …' : 'Gjem agent'}
            </Button>
          </DialogActions>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <Button variant="outlined" onClick={() => setOpen(true)}>
        Publiser
      </Button>

      <Dialog open={open} onClose={close} fullWidth maxWidth="sm">
        <form onSubmit={submitPublish} noValidate>
          <DialogTitle>Publiser til The Candidate</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Alle som bruker The Candidate kan velge agenten. De ser bare navnet og beskrivelsen
              under, ikke svarene om jobbsøkeren eller systemprompten.
            </DialogContentText>
            <Alert severity="warning" sx={{ mt: 2 }}>
              Ikke skriv noe om jobbsøkeren her.
            </Alert>
            <TextField
              label="Navn i The Candidate"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              error={nameMissing}
              helperText={nameMissing ? 'Skriv et navn.' : ' '}
              slotProps={{ htmlInput: { maxLength: MAX_NAME_LENGTH } }}
              fullWidth
              margin="normal"
              autoFocus
            />
            <TextField
              label="Kort beskrivelse"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              helperText={`${description.length}/${MAX_PUBLIC_DESCRIPTION_LENGTH}`}
              slotProps={{ htmlInput: { maxLength: MAX_PUBLIC_DESCRIPTION_LENGTH } }}
              fullWidth
              multiline
              minRows={2}
              margin="normal"
            />
            {error && (
              <Alert severity="error" sx={{ mt: 1 }}>
                {error}
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={close} disabled={sending}>
              Avbryt
            </Button>
            <Button type="submit" variant="contained" disabled={sending || nameMissing}>
              {sending ? 'Publiserer …' : 'Publiser'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
}
