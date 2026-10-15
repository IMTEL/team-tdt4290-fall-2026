'use client';

import { useId } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';

import { AnswerList } from '@/components/agents/AnswerList';
import type { AgentTypeDefinition, AnswerSources, Answers } from '@/domain/agentTypes/types';
import { SaveAgentForm } from './SaveAgentForm';

type ConfirmConfigurationProps = {
  /** The type of agent being saved: its fields, in the order to show them, and how to save it. */
  definition: AgentTypeDefinition;
  configuration: Answers;
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
  definition,
  configuration,
  sources,
  open,
  onClose,
}: ConfirmConfigurationProps) {
  const headingId = useId();

  return (
    // keepMounted keeps the save form's state, so a saved agent stays saved when the
    // pop-up is closed and opened again.
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby={headingId}
      fullWidth
      maxWidth="sm"
      keepMounted
    >
      <DialogTitle id={headingId}>Stemmer dette?</DialogTitle>
      <SaveAgentForm
        definition={definition}
        configuration={configuration}
        sources={sources}
        onClose={onClose}
      >
        {/* What will be saved, including anything the counsellor added under Tillegg. */}
        <AnswerList fields={definition.fields} answers={configuration} />
      </SaveAgentForm>
    </Dialog>
  );
}
