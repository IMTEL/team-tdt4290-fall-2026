'use client';

import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';

import { AgentCardGrid } from '@/components/agents/AgentCardGrid';
import { NewAgentCard } from '@/components/agents/NewAgentCard';
import { groupAgentsByType, type AgentSection } from '@/domain/agentList';
import { getAgentType } from '@/domain/agentTypes/registry';
import type { Agent } from '@/lib/types';
import { fetchAgents } from './api';
import styles from './AgentList.module.css';

type ListState = { kind: 'loading' } | { kind: 'ready'; agents: Agent[] } | { kind: 'error' };

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
 * request are different states.
 */
export function AgentList() {
  const [state, setState] = useState<ListState>({ kind: 'loading' });

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

  if (state.kind === 'loading') {
    return <Typography>Laster agenter …</Typography>;
  }

  if (state.kind === 'error') {
    return <Alert severity="error">Noe gikk galt. Prøv igjen.</Alert>;
  }

  return sectionsWithNewAgent(state.agents).map((section) => (
    <section key={section.key} className={styles.section}>
      <Typography variant="h5" component="h2" gutterBottom>
        {section.title}
      </Typography>
      <AgentCardGrid
        agents={section.agents}
        leading={section.key === 'interviewer' ? <NewAgentCard /> : undefined}
      />
    </section>
  ));
}
