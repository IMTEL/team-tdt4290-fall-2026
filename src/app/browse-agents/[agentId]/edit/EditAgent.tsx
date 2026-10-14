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

import { readStoredAnswers } from '@/domain/agentTypes/storedAnswers';
import { updateAgent } from '../../api';
import { useAnswerPresets } from '../../useAnswerPresets';
import { useAgent } from '../../useAgent';
import { EditAgentForm } from './EditAgentForm';

/** Loads one of the counsellor's agents and shows the form for editing it. */
export function EditAgent({ agentId }: { agentId: string }) {
  const state = useAgent(agentId);
  const stored = state.kind === 'ready' ? readStoredAnswers(state.agent.description) : null;
  const presets = useAnswerPresets(stored?.definition);

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

      {stored ? (
        <EditAgentForm
          agentId={agent.id}
          initialName={agent.name}
          definition={stored.definition}
          initialAnswers={stored.answers}
          initialSources={stored.sources}
          label="Rediger agent"
          presets={presets}
          submitLabel="Lagre endringer"
          onSave={async (newName, newAnswers, newSources) => {
            await updateAgent(agent.id, newName, newAnswers, newSources);
            return agent.id;
          }}
        />
      ) : (
        <Alert severity="info">Denne agenten ble ikke laget her, og kan ikke redigeres.</Alert>
      )}
    </Box>
  );
}
