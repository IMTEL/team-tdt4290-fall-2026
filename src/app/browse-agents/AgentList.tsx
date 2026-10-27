'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import SearchIcon from '@mui/icons-material/Search';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import InputAdornment from '@mui/material/InputAdornment';
import Snackbar from '@mui/material/Snackbar';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { readWizardDraft, subscribeWizardDraft } from '@/app/configure/wizardDraft';
import { AgentCardGrid, AGENT_CARD_SIZE } from '@/components/agents/AgentCardGrid';
import { DraftAgentCard } from '@/components/agents/DraftAgentCard';
import { NewAgentCard } from '@/components/agents/NewAgentCard';
import {
  groupAgentsByType,
  searchAgents,
  searchWords,
  toSearchableAgents,
  type AgentSection,
  type SearchableAgent,
} from '@/domain/agentList';
import { getAgentType } from '@/domain/agentTypes/registry';
import type { Agent } from '@/lib/types';
import { useOnceInBrowser } from '@/lib/useOnceInBrowser';
import { fetchAgents } from './api';
import { AGENT_SAVED_FLASH, DRAFT_SAVED_FLASH, takeAgentsFlash } from './flash';
import styles from './AgentList.module.css';

// The search text is built once, when the list arrives, not on every keystroke.
type ListState =
  | { kind: 'loading' }
  | { kind: 'ready'; agents: Agent[]; searchable: SearchableAgent[] }
  | { kind: 'error' };

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
 * request are different states. A local unfinished wizard shows as an utkast card. While there is
 * a search, only the agents that match are shown, without «Ny agent» and the utkast.
 */
export function AgentList() {
  const [state, setState] = useState<ListState>({ kind: 'loading' });
  const [toast, setToast] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const searchField = useRef<HTMLInputElement>(null);
  const draft = useSyncExternalStore(subscribeWizardDraft, readWizardDraft, () => null);

  useEffect(() => {
    let cancelled = false;
    fetchAgents()
      .then((agents) => {
        if (!cancelled) setState({ kind: 'ready', agents, searchable: toSearchableAgents(agents) });
      })
      .catch(() => {
        if (!cancelled) setState({ kind: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // One-shot flash from the previous page (save / lagre utkast).
  useOnceInBrowser(() => {
    const message = toastFromFlash();
    if (message) setToast(message);
  });

  let body;
  if (state.kind === 'loading') {
    body = <Typography>Laster agenter …</Typography>;
  } else if (state.kind === 'error') {
    body = <Alert severity="error">Noe gikk galt. Prøv igjen.</Alert>;
  } else {
    const words = searchWords(query);
    const searching = words.length > 0;
    const found = searching ? searchAgents(state.searchable, words) : state.agents;
    const sections = searching ? groupAgentsByType(found) : sectionsWithNewAgent(found);
    const starterCards = (
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
    );
    body = (
      <>
        <div className={styles.search}>
          <TextField
            type="search"
            // English translation: Search agents
            label="Søk i agenter"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            inputRef={searchField}
            fullWidth
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              },
            }}
          />
        </div>
        <div role="status" className={styles.srOnly}>
          {/* English translation: N agent(s) found */}
          {searching ? `${found.length} ${found.length === 1 ? 'agent' : 'agenter'} funnet` : ''}
        </div>
        {searching && found.length === 0 ? (
          <div className={styles.noMatch}>
            {/* English translation: No agents match the search. */}
            <Typography>Ingen agenter passer søket.</Typography>
            <Button
              variant="outlined"
              onClick={() => {
                setQuery('');
                // The button goes away with the message, so focus goes back to the search.
                searchField.current?.focus();
              }}
            >
              {/* English translation: Clear the search */}
              Tøm søket
            </Button>
          </div>
        ) : (
          sections.map((section) => (
            <section key={section.key} className={styles.section}>
              <Typography variant="h5" component="h2" gutterBottom>
                {section.title}
              </Typography>
              <AgentCardGrid
                agents={section.agents}
                leading={section.key === 'interviewer' && !searching ? starterCards : undefined}
              />
            </section>
          ))
        )}
      </>
    );
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
