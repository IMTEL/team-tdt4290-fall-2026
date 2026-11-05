'use client';

import type { FormEvent } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';

import { FieldHelp } from '@/components/ui/FieldHelp';
import helpStyles from '@/components/ui/FieldHelp.module.css';
import { MAX_NAME_LENGTH } from '@/domain/agentName';
import { MAX_PUBLIC_DESCRIPTION_LENGTH } from '@/domain/publication';

type Props = {
  open: boolean;
  name: string;
  description: string;
  sending: boolean;
  error: string | null;
  onNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};

/**
 * The same dialog as on an agent's page: a public name and a short description, then publish
 * to The Candidate. Nothing about the job seeker belongs in either field.
 */
export function PublishToCandidateDialog({
  open,
  name,
  description,
  sending,
  error,
  onNameChange,
  onDescriptionChange,
  onClose,
  onSubmit,
}: Props) {
  const nameMissing = name.trim() === '';

  function submit(event: FormEvent) {
    event.preventDefault();
    if (nameMissing || sending) return;
    onSubmit();
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <form onSubmit={submit} noValidate>
        <DialogTitle>Publiser til The Candidate</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Alle som bruker The Candidate kan velge agenten. De ser bare navnet og beskrivelsen
            under, ikke svarene om jobbsøkeren eller systemprompten.
          </DialogContentText>
          <Alert severity="warning" sx={{ mt: 2 }}>
            Ikke skriv noe om jobbsøkeren her.
          </Alert>
          <div className={helpStyles.besideInput}>
            <TextField
              label="Navn i The Candidate"
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
              required
              error={nameMissing}
              helperText={nameMissing ? 'Skriv et navn.' : `${name.length}/${MAX_NAME_LENGTH} tegn`}
              slotProps={{ htmlInput: { maxLength: MAX_NAME_LENGTH } }}
              fullWidth
              margin="normal"
              autoFocus
            />
            <FieldHelp
              label="Navn i The Candidate"
              description="Navnet jobbsøkere ser når de velger intervjuer i The Candidate."
            />
          </div>
          <div className={helpStyles.besideInput}>
            <TextField
              label="Kort beskrivelse"
              value={description}
              onChange={(event) => onDescriptionChange(event.target.value)}
              helperText={`${description.length}/${MAX_PUBLIC_DESCRIPTION_LENGTH}`}
              slotProps={{ htmlInput: { maxLength: MAX_PUBLIC_DESCRIPTION_LENGTH } }}
              fullWidth
              multiline
              minRows={2}
              margin="normal"
            />
            <FieldHelp
              label="Kort beskrivelse"
              description="En kort tekst jobbsøkere ser sammen med navnet. Ikke skriv noe om jobbsøkeren."
            />
          </div>
          {error && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={sending}>
            Avbryt
          </Button>
          <Button type="submit" variant="contained" disabled={sending || nameMissing}>
            {sending ? 'Publiserer …' : 'Publiser'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
