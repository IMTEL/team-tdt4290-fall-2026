'use client';

import { useEffect, useState } from 'react';

import type { Agent } from '@/lib/types';
import { fetchAgents } from './api';

export type AgentState =
  { kind: 'loading' } | { kind: 'ready'; agent: Agent } | { kind: 'missing' } | { kind: 'error' };

/** Loads one of the counsellor's agents. `missing` when the list has no agent with this id. */
export function useAgent(agentId: string): AgentState {
  const [state, setState] = useState<AgentState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    fetchAgents()
      .then((agents) => {
        if (cancelled) return;
        const agent = agents.find((item) => item.id === agentId);
        setState(agent ? { kind: 'ready', agent } : { kind: 'missing' });
      })
      .catch(() => {
        if (!cancelled) setState({ kind: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [agentId]);

  return state;
}
