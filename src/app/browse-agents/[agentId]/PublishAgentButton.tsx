'use client';

import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

import { PublishToCandidateDialog } from '@/components/agents/PublishToCandidateDialog';
import { MAX_NAME_LENGTH } from '@/domain/agentName';
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
  // Cut to the limit: agents saved before it was lowered can have longer names.
  const [name, setName] = useState(
    (publication.publicName || agent.name).slice(0, MAX_NAME_LENGTH),
  );
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

  if (publication.isPublished) {
    return (
      <>
        <Button variant="outlined" onClick={() => setOpen(true)}>
          Gjem agent
        </Button>

        {/* Own keys, so the publish dialog is not reused, fading out with this text. */}
        <Dialog key="hide" open={open} onClose={close}>
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

      <PublishToCandidateDialog
        open={open}
        name={name}
        description={description}
        sending={sending}
        error={error}
        onNameChange={setName}
        onDescriptionChange={setDescription}
        onClose={close}
        onSubmit={() => {
          if (nameMissing) return;
          send(() => publishAgent(agent.id, name.trim(), description.trim()));
        }}
      />
    </>
  );
}
