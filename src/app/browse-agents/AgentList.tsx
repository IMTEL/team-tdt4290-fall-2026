'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import Alert from '@mui/material/Alert';
import Grid from '@mui/material/Grid';
import Snackbar from '@mui/material/Snackbar';
import Typography from '@mui/material/Typography';

import { readWizardDraft, subscribeWizardDraft } from '@/app/configure/wizardDraft';
import { AgentCardGrid, AGENT_CARD_SIZE } from '@/components/agents/AgentCardGrid';
import { DraftAgentCard } from '@/components/agents/DraftAgentCard';
import { NewAgentCard } from '@/components/agents/NewAgentCard';
import { groupAgentsByType, type AgentSection } from '@/domain/agentList';
import { getAgentType } from '@/domain/agentTypes/registry';
import type { Agent } from '@/lib/types';
import { fetchAgents } from './api';
import { AGENT_SAVED_FLASH, DRAFT_SAVED_FLASH, takeAgentsFlash } from './flash';
import styles from './AgentList.module.css';

type ListState = { kind: 'loading' } | { kind: 'ready'; agents: Agent[] } | { kind: 'error' };

/** True after hydration, so browser storage can be read without a server/client HTML mismatch. */
function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

function toastFromFlash(): string | null {
  const flash = takeAgentsFlash();
  if (flash === AGENT_SAVED_FLASH) return 'Agent lagret';
  if (flash === DRAFT_SAVED_FLASH) return 'Utkast lagret';
  return null;
}

/**
 * «Ny agent» is the first card in the interviewer section, in the same row as those agents. An
 * empty list still shows that section, so the card has somewhere to sit.
 */
function sectionsWithNewAgent(agents: Agent[]): AgentSection[] {
  const sections = groupAgentsByType(agents);
  if (sections.some((section) => section.key === 'interviewer')) return sections;

  const interviewer = getAgentType('interviewer');
  return [
    { key: 'interviewer', title: interviewer?.label ?? 'Intervjuer', agents: [] },
    ...sections,
  ];
}

/**
 * The counsellor's agents as cards, in one section per agent type. An empty list and a failed
 * request are different states. A local unfinished wizard shows as an utkast card.
 */
export function AgentList() {
  const isClient = useIsClient();
  const [state, setState] = useState<ListState>({ kind: 'loading' });
  const [toast, setToast] = useState<string | null>(null);
  const [flashSeen, setFlashSeen] = useState(false);
  const draft = useSyncExternalStore(subscribeWizardDraft, readWizardDraft, () => null);

  useEffect(() => {
    let cancelled = false;
    fetchAgents()
      .then((agents) => {
        if (!cancelled) setState({ kind: 'ready', agents });
      })
      .catch(() => {
        if (!cancelled) setState({ kind: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // One-shot flash from the previous page (save / lagre utkast). Read after hydration only.
  if (isClient && !flashSeen) {
    setFlashSeen(true);
    const message = toastFromFlash();
    if (message) setToast(message);
  }

  let body;
  if (state.kind === 'loading') {
    body = <Typography>Laster agenter …</Typography>;
  } else if (state.kind === 'error') {
    body = <Alert severity="error">Noe gikk galt. Prøv igjen.</Alert>;
  } else {
    body = sectionsWithNewAgent(state.agents).map((section) => (
      <section key={section.key} className={styles.section}>
        <Typography variant="h5" component="h2" gutterBottom>
          {section.title}
        </Typography>
        <AgentCardGrid
          agents={section.agents}
          leading={
            section.key === 'interviewer' ? (
              <>
                <Grid size={AGENT_CARD_SIZE}>
                  <NewAgentCard />
                </Grid>
                {draft?.agentTypeId === 'interviewer' && (
                  <Grid size={AGENT_CARD_SIZE}>
                    <DraftAgentCard draft={draft} />
                  </Grid>
                )}
              </>
            ) : undefined
          }
        />
      </section>
    ));
  }

  return (
    <>
      {body}
      <Snackbar
        open={toast !== null}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        message={toast ?? ''}
      />
    </>
  );
}
