'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
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
};

/** Shown under the chat once the configurator has finished: name the agent and save it. */
export function SaveAgentForm({ definition, configuration, sources = {} }: SaveAgentFormProps) {
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
      const id = await saveConfiguredAgent(name.trim(), configuration, sources, advanced, avatar);
      setStatus({ kind: 'saved', id });
    } catch (error) {
      // Only ChatError messages are written for users; anything else could be technical.
      setStatus({
        kind: 'error',
        message: error instanceof ChatError ? error.userMessage : 'Noe gikk galt. Prøv igjen.',
      });
    }
  }

  if (status.kind === 'saved') {
    return (
      <Alert severity="success">
        «{name.trim()}» er lagret.{' '}
        <Link href={`/test-chat?agent=${encodeURIComponent(status.id)}`}>Test agenten</Link> eller{' '}
        <Link href="/browse-agents">se agentene dine</Link>
      </Alert>
    );
  }

  const isSaving = status.kind === 'saving';

  return (
    <form className={styles.form} onSubmit={handleSubmit} aria-label="Lagre agenten">
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
      <div className={styles.avatar}>
        {/* English translation: Choose an avatar for the interviewer */}
        <p className={styles.avatarLabel}>Velg en avatar for intervjueren</p>
        <AvatarPicker value={avatar} onChange={setAvatar} disabled={isSaving} />
      </div>
      {/* The configurator only makes interviewers until #56 lets the counsellor choose the type. */}
      <AdvancedSettingsFields
        value={settings}
        onChange={setSettings}
        builtPrompt={definition.buildPrompt(configuration)}
        languageModels={languageModels}
        errors={settingsErrors}
        disabled={isSaving}
      />
      {status.kind === 'error' && <Alert severity="error">{status.message}</Alert>}
      <Button
        type="submit"
        variant="contained"
        className={styles.button}
        disabled={isSaving || name.trim() === '' || Object.keys(settingsErrors).length > 0}
      >
        {isSaving ? 'Lagrer …' : 'Lagre agent'}
      </Button>
    </form>
  );
}
