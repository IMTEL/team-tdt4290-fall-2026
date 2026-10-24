'use client';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { settingsOf } from '@/domain/advancedSettings';
import { cloneName } from '@/domain/agentName';
import { readStoredAnswers } from '@/domain/agentTypes/storedAnswers';
import { cloneAgent } from '../../api';
import { useAnswerPresets, useLegalPreset } from '../../useAnswerPresets';
import { useAgent } from '../../useAgent';
import { EditAgentForm } from '../edit/EditAgentForm';

/**
 * Loads one of the counsellor's agents and shows the edit form filled in from it. Nothing is
 * saved until the counsellor saves, and then as a new agent; the original is not changed.
 */
export function CloneAgent({ agentId }: { agentId: string }) {
  const state = useAgent(agentId);
  const stored = state.kind === 'ready' ? readStoredAnswers(state.agent.description) : null;
  const presets = useAnswerPresets(stored?.definition);
  const legalPreset = useLegalPreset(stored?.definition);

  if (state.kind === 'missing') notFound();
  if (state.kind === 'loading') return <Typography>Laster agent …</Typography>;
  if (state.kind === 'error') return <Alert severity="error">Noe gikk galt. Prøv igjen.</Alert>;
  if (state.kind !== 'ready') return null;

  const { agent } = state;

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 960, mx: 'auto' }}>
      <Button
        component={Link}
        href={`/browse-agents/${agent.id}`}
        startIcon={<ArrowBackIcon />}
        size="small"
        sx={{ mb: 2 }}
      >
        Tilbake til agenten
      </Button>

      <Typography variant="h4" component="h1">
        Klon agent
      </Typography>
      <Stack direction="row" spacing={1} sx={{ mt: 1, mb: 3, alignItems: 'center' }}>
        <Typography color="text.secondary">Kopi av {agent.name}</Typography>
        {stored && <Chip label={stored.definition.label} size="small" color="secondary" />}
      </Stack>

      {stored ? (
        <EditAgentForm
          agentId={agent.id}
          initialName={cloneName(agent.name)}
          definition={stored.definition}
          initialAnswers={stored.answers}
          initialSources={stored.sources}
          initialSettings={settingsOf(
            { model: agent.llmModel, temperature: agent.temperature, prompt: agent.prompt },
            stored.customPrompt,
          )}
          initialAvatar={stored.avatar}
          label="Klon agent"
          submitLabel="Lagre som ny agent"
          onSave={(name, answers, sources, settings, avatar) =>
            cloneAgent(agent.id, name, answers, sources, settings, avatar)
          }
          allowUnchanged
          presets={presets}
          legalPreset={legalPreset}
        />
      ) : (
        <Alert severity="info">Denne agenten ble ikke laget her, og kan ikke klones.</Alert>
      )}
    </Box>
  );
}
