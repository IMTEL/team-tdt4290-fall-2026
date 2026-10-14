'use client';

import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { AnswerList } from '@/components/agents/AnswerList';
import { interviewer } from '@/domain/agentTypes/interviewer';
import type { AnswerSources } from '@/domain/agentTypes/types';
import type { Configuration } from '@/domain/configuration';
import { SaveAgentForm } from './SaveAgentForm';
import styles from './ConfirmConfiguration.module.css';

type ConfirmConfigurationProps = {
  configuration: Configuration;
  sources: AnswerSources;
  /** The counsellor wants to change something: close this and go back to the chat. */
  onChange: () => void;
};

/**
 * Shown when the configurator has finished: the configuration, a form to save it, and a way back
 * to the chat to change something. The counsellor confirms here instead of typing in the chat.
 */
export function ConfirmConfiguration({
  configuration,
  sources,
  onChange,
}: ConfirmConfigurationProps) {
  return (
    <section aria-labelledby="confirm-heading" className={styles.confirm}>
      <Typography id="confirm-heading" variant="h6" component="h2">
        Stemmer dette?
      </Typography>
      {/* What will be saved, including anything the counsellor added under Tillegg. */}
      <AnswerList fields={interviewer.fields} answers={configuration} />
      <SaveAgentForm configuration={configuration} sources={sources} />
      <Button variant="outlined" onClick={onChange} className={styles.change}>
        Nei, jeg vil endre noe
      </Button>
    </section>
  );
}
