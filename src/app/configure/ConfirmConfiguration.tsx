'use client';

import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';

import { AnswerList } from '@/components/agents/AnswerList';
import { interviewer } from '@/domain/agentTypes/interviewer';
import type { AnswerSources } from '@/domain/agentTypes/types';
import type { Configuration } from '@/domain/configuration';
import { SaveAgentForm } from './SaveAgentForm';
import styles from './ConfirmConfiguration.module.css';

type ConfirmConfigurationProps = {
  configuration: Configuration;
  sources: AnswerSources;
  open: boolean;
  /** The counsellor wants to change something: close this and go back to the chat. */
  onClose: () => void;
};

/**
 * A pop-up shown when the configurator has finished: the configuration, a form to save it, and a
 * way back to the chat to change something. The counsellor confirms here instead of in the chat.
 */
export function ConfirmConfiguration({
  configuration,
  sources,
  open,
  onClose,
}: ConfirmConfigurationProps) {
  return (
    // keepMounted keeps the save form's state, so a saved interviewer stays saved when the
    // pop-up is closed and opened again.
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="confirm-heading"
      fullWidth
      maxWidth="sm"
      keepMounted
    >
      <DialogTitle id="confirm-heading">Stemmer dette?</DialogTitle>
      <DialogContent dividers className={styles.content}>
        {/* What will be saved, including anything the counsellor added under Tillegg. */}
        <AnswerList fields={interviewer.fields} answers={configuration} />
        <SaveAgentForm configuration={configuration} sources={sources} />
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={onClose}>
          Nei, jeg vil endre noe
        </Button>
      </DialogActions>
    </Dialog>
  );
}
