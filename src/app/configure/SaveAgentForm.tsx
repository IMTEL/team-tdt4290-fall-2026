'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import TextField from '@mui/material/TextField';

import { AdvancedSettingsFields } from '@/components/agents/AdvancedSettingsFields';
import { AvatarPicker } from '@/components/agents/AvatarPicker';
import { useLanguageModels } from '@/components/agents/useLanguageModels';
import { ChatError } from '@/components/chat/sendToAgent';
import { advancedSettingsErrors, DEFAULT_ADVANCED_SETTINGS } from '@/domain/advancedSettings';
import type { AgentTypeDefinition, AnswerSources, Answers } from '@/domain/agentTypes/types';
import { saveConfiguredAgent } from './api';
import styles from './SaveAgentForm.module.css';

// Same limit as POST /api/agents.
const MAX_NAME_LENGTH = 100;

type SaveStatus =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved'; id: string }
  | { kind: 'error'; message: string };

type SaveAgentFormProps = {
  definition: AgentTypeDefinition;
  configuration: Answers;
  /** The template and profile the answers came from, so the edit form can show them later. */
  sources?: AnswerSources;
  /** Shown below the name field, e.g. the configuration that will be saved. */
  children?: ReactNode;
  /** The counsellor wants to change something, or is done after saving: close the pop-up. */
  onClose: () => void;
};

/**
 * The body and buttons of the pop-up shown once the configurator has finished: name the agent
 * and save it. Goes inside a MUI Dialog, so the buttons sit at the bottom of it.
 */
export function SaveAgentForm({
  definition,
  configuration,
  sources = {},
  children,
  onClose,
}: SaveAgentFormProps) {
  const [name, setName] = useState(() => definition.defaultName(configuration));
  const [settings, setSettings] = useState(DEFAULT_ADVANCED_SETTINGS);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [status, setStatus] = useState<SaveStatus>({ kind: 'idle' });
  const languageModels = useLanguageModels();
  const settingsErrors = advancedSettingsErrors(settings, languageModels.models);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ kind: 'saving' });
    try {
      // Untouched settings are not sent, and the server uses its defaults.
      const advanced = settings === DEFAULT_ADVANCED_SETTINGS ? undefined : settings;
      const id = await saveConfiguredAgent(
        name.trim(),
        definition,
        configuration,
        sources,
        advanced,
        avatar,
      );
      setStatus({ kind: 'saved', id });
    } catch (error) {
      // Only ChatError messages are written for users; anything else could be technical.
      setStatus({
        kind: 'error',
        message: error instanceof ChatError ? error.userMessage : 'Noe gikk galt. Prøv igjen.',
      });
    }
  }

  const isSaved = status.kind === 'saved';
  const isSaving = status.kind === 'saving';

  return (
    <form className={styles.form} onSubmit={handleSubmit} aria-label="Lagre agenten">
      <DialogContent dividers className={styles.content}>
        {isSaved ? (
          <Alert severity="success">
            «{name.trim()}» er lagret.{' '}
            <Link href={`/test-chat?agent=${encodeURIComponent(status.id)}`}>Test agenten</Link>{' '}
            eller <Link href="/browse-agents">se agentene dine</Link>
          </Alert>
        ) : (
          <>
            <p className={styles.lead}>Agenten er klar. Gi den et navn og lagre den.</p>
            <TextField
              label="Navn på agenten"
              value={name}
              onChange={(event) => setName(event.target.value)}
              size="small"
              required
              disabled={isSaving}
              slotProps={{ htmlInput: { maxLength: MAX_NAME_LENGTH } }}
            />
          </>
        )}
        {children}
        {!isSaved && (
          <>
            <div className={styles.avatar}>
              {/* English translation: Choose an avatar for the interviewer */}
              <p className={styles.avatarLabel}>Velg en avatar for intervjueren</p>
              <AvatarPicker value={avatar} onChange={setAvatar} disabled={isSaving} />
            </div>
            <AdvancedSettingsFields
              value={settings}
              onChange={setSettings}
              builtPrompt={definition.buildPrompt(configuration)}
              languageModels={languageModels}
              errors={settingsErrors}
              disabled={isSaving}
            />
          </>
        )}
        {/* Last, so it shows next to the save button that was just clicked. */}
        {status.kind === 'error' && <Alert severity="error">{status.message}</Alert>}
      </DialogContent>
      <DialogActions>
        {isSaved ? (
          <Button variant="contained" onClick={onClose}>
            Lukk
          </Button>
        ) : (
          <>
            <Button variant="outlined" onClick={onClose} disabled={isSaving}>
              Nei, jeg vil endre noe
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isSaving || name.trim() === '' || Object.keys(settingsErrors).length > 0}
            >
              {isSaving ? 'Lagrer …' : 'Lagre agent'}
            </Button>
          </>
        )}
      </DialogActions>
    </form>
  );
}
