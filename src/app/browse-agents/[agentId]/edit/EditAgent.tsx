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
import { readStoredAnswers } from '@/domain/agentTypes/storedAnswers';
import { updateAgent } from '../../api';
import { setAgentHiddenFlash } from '../../flash';
import { useAnswerPresets, useLegalPreset } from '../../useAnswerPresets';
import { useAgent } from '../../useAgent';
import { EditAgentForm } from './EditAgentForm';

/** Loads one of the counsellor's agents and shows the form for editing it. */
export function EditAgent({ agentId }: { agentId: string }) {
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
        Rediger agent
      </Typography>
      <Stack direction="row" spacing={1} sx={{ mt: 1, mb: 3, alignItems: 'center' }}>
        <Typography color="text.secondary">{agent.name}</Typography>
        {stored && <Chip label={stored.definition.label} size="small" color="secondary" />}
      </Stack>

      {stored && agent.isPublished && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Agenten er publisert i The Candidate. Når du lagrer, blir den gjemt fra The Candidate.
          Test den før du publiserer den på nytt.
        </Alert>
      )}

      {stored ? (
        <EditAgentForm
          agentId={agent.id}
          initialName={agent.name}
          definition={stored.definition}
          initialAnswers={stored.answers}
          initialSources={stored.sources}
          initialSettings={settingsOf(
            { model: agent.llmModel, temperature: agent.temperature, prompt: agent.prompt },
            stored.customPrompt,
          )}
          initialAvatar={stored.avatar}
          label="Rediger agent"
          presets={presets}
          legalPreset={legalPreset}
          submitLabel="Lagre endringer"
          onSave={async (newName, newAnswers, newSources, newSettings, newAvatar) => {
            const updated = await updateAgent(
              agent.id,
              newName,
              newAnswers,
              newSources,
              newSettings,
              newAvatar,
            );
            // The server hides a published agent when it is edited; the agent's page says so.
            if (agent.isPublished && !updated.isPublished) setAgentHiddenFlash(agent.id);
            return agent.id;
          }}
        />
      ) : (
        <Alert severity="info">Denne agenten ble ikke laget her, og kan ikke redigeres.</Alert>
      )}
    </Box>
  );
}
