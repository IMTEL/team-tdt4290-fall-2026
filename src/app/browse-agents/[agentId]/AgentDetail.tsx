'use client';

import { DeleteAgentButton } from './DeleteAgentButton';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Snackbar from '@mui/material/Snackbar';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';

import { AgentAvatar } from '@/components/agents/AgentAvatar';
import { AnswerList } from '@/components/agents/AnswerList';
import { DEFAULT_TEMPERATURE, formatTemperature } from '@/domain/advancedSettings';
import { readStoredAnswers } from '@/domain/agentTypes/storedAnswers';
import { formatDate } from '@/lib/format';

import { useAgent } from '../useAgent';
import styles from './AgentDetail.module.css';

type TabId = 'config' | 'advanced' | 'prompt';

/**
 * One saved agent: a summary in sentences, the actions, then tabs for the configuration, the
 * advanced settings (model and temperature) and the system prompt RAGdoll has stored. They are
 * changed on the edit page.
 */
export function AgentDetail({ agentId }: { agentId: string }) {
  const state = useAgent(agentId);
  // Always opens on the configuration; the last tab is not remembered.
  const [tab, setTab] = useState<TabId>('config');
  const [copyMessage, setCopyMessage] = useState('');
  const [copyMessageOpen, setCopyMessageOpen] = useState(false);

  if (state.kind === 'missing') notFound();

  if (state.kind === 'loading') {
    return <AgentDetailSkeleton />;
  }

  if (state.kind === 'error') {
    return <Alert severity="error">Noe gikk galt. Prøv igjen.</Alert>;
  }

  if (state.kind !== 'ready') return null;

  const { agent } = state;
  const agentPath = `/browse-agents/${encodeURIComponent(agent.id)}`;
  // Knows the old and the new way of storing answers, and works for every agent type.
  const stored = readStoredAnswers(agent.description);
  // Empty if the answers say too little to write a sentence about.
  const summary = stored ? stored.definition.buildSummary(stored.answers) : '';
  // RAGdoll can send a value that is not a date; then the date is left out.
  const hasLastUpdated = !Number.isNaN(new Date(agent.lastUpdated).getTime());
  const prompt = agent.prompt;

  async function copyPrompt() {
    try {
      // Throws as well when the browser has no clipboard (e.g. a page served over plain http).
      await navigator.clipboard.writeText(prompt);
      // English translation: Copied
      setCopyMessage('Kopiert');
    } catch {
      // English translation: Could not copy. Select the text and copy it yourself.
      setCopyMessage('Kunne ikke kopiere. Marker teksten og kopier den selv.');
    }
    setCopyMessageOpen(true);
  }

  return (
    <div className={styles.page}>
      {/* The margin is on a wrapper: MUI's own styles load after ours and reset its margin. */}
      <div className={styles.backLink}>
        <Button component={Link} href="/browse-agents" startIcon={<ArrowBackIcon />} size="small">
          {/* English translation: Back to the agents */}
          Tilbake til agentene
        </Button>
      </div>

      <div className={styles.header}>
        <AgentAvatar avatar={agent.avatar} size={72} />
        <div className={styles.titleBlock}>
          <Typography variant="h4" component="h1">
            {agent.name}
          </Typography>
          <div className={styles.meta}>
            {/* Agents saved before types could be chosen are read as interviewers. */}
            {stored && (
              <>
                {/* English translation: Agent type */}
                <span className={styles.srOnly}>Agenttype:</span>
                <Chip label={stored.definition.label} size="small" color="secondary" />
              </>
            )}
            {hasLastUpdated && (
              <Typography variant="body2" color="text.secondary">
                {/* English translation: Last changed */}
                Sist endret {formatDate(agent.lastUpdated)}
              </Typography>
            )}
          </div>
        </div>
      </div>

      {summary && (
        <Paper
          component="section"
          variant="outlined"
          aria-labelledby="summary-heading"
          className={styles.summary}
        >
          {/* English translation: Summary */}
          <Typography
            id="summary-heading"
            variant="overline"
            component="h2"
            className={styles.summaryLabel}
          >
            Oppsummering
          </Typography>
          <Typography variant="body1">{summary}</Typography>
        </Paper>
      )}

      {/* Above the tabs, so the actions are seen whichever tab is open. */}
      <div className={styles.actions}>
        <Button
          component={Link}
          href={`/test-chat?agent=${encodeURIComponent(agent.id)}`}
          variant="contained"
        >
          Test agenten
        </Button>
        {/* Only agents made in this app have answers that can be edited or cloned. */}
        {stored && (
          <Button component={Link} href={`${agentPath}/edit`} variant="outlined">
            Rediger
          </Button>
        )}
        {stored && (
          <Button component={Link} href={`${agentPath}/clone`} variant="outlined">
            Klon
          </Button>
        )}
        <DeleteAgentButton agent={agent} />
      </div>

      <Tabs
        value={tab}
        onChange={(_, value: TabId) => setTab(value)}
        variant="scrollable"
        allowScrollButtonsMobile
        selectionFollowsFocus
        // English translation: Agent details
        aria-label="Agentdetaljer"
        className={styles.tabs}
      >
        {/* English translation: Configuration */}
        <Tab value="config" label="Konfigurasjon" {...tabProps('config', tab)} />
        {/* English translation: Advanced settings */}
        <Tab value="advanced" label="Avanserte innstillinger" {...tabProps('advanced', tab)} />
        {/* English translation: System prompt */}
        <Tab value="prompt" label="Systemprompt" {...tabProps('prompt', tab)} />
      </Tabs>

      {tab === 'config' && (
        <TabPanel id="config">
          {stored ? (
            <AnswerList fields={stored.definition.fields} answers={stored.answers} />
          ) : (
            <Typography variant="body1">{agent.description}</Typography>
          )}
        </TabPanel>
      )}

      {tab === 'advanced' && (
        <TabPanel id="advanced">
          <dl className={styles.fields}>
            {/* English translation: Language model */}
            <Field label="Språkmodell" value={agent.llmModel} />
            {/* English translation: Temperature */}
            <Field
              label="Temperatur"
              value={formatTemperature(agent.temperature ?? DEFAULT_TEMPERATURE)}
            />
          </dl>
        </TabPanel>
      )}

      {tab === 'prompt' && (
        <TabPanel id="prompt">
          {(stored?.customPrompt || prompt) && (
            <div className={styles.panelActions}>
              {stored?.customPrompt && (
                // English translation: Written by hand
                <Chip label="Skrevet for hånd" size="small" variant="outlined" />
              )}
              <span className={styles.spacer} />
              {prompt && (
                <Button size="small" startIcon={<ContentCopyIcon />} onClick={copyPrompt}>
                  {/* English translation: Copy */}
                  Kopier
                </Button>
              )}
            </div>
          )}
          {/* The prompt RAGdoll has stored, not one built again from the answers. */}
          <div className={styles.promptBox}>
            <Typography component="pre" variant="body2" className={styles.prompt}>
              {prompt || '–'}
            </Typography>
          </div>
        </TabPanel>
      )}

      <Snackbar
        open={copyMessageOpen}
        autoHideDuration={3000}
        onClose={() => setCopyMessageOpen(false)}
        message={copyMessage}
      />
    </div>
  );
}

/**
 * Links a tab to its panel, so screen readers know which panel a tab shows. Only the open panel is
 * rendered, so only the selected tab points to one.
 */
function tabProps(id: TabId, selected: TabId) {
  return {
    id: `agent-tab-${id}`,
    'aria-controls': id === selected ? `agent-panel-${id}` : undefined,
  };
}

/** Only the open tab's panel is rendered. */
function TabPanel({ id, children }: { id: TabId; children: ReactNode }) {
  return (
    <div
      role="tabpanel"
      id={`agent-panel-${id}`}
      aria-labelledby={`agent-tab-${id}`}
      className={styles.panel}
    >
      {children}
    </div>
  );
}

/** One label and its value in a list; a dash when there is no value. */
function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className={styles.field}>
      <Typography component="dt" variant="subtitle2">
        {label}
      </Typography>
      <Typography component="dd" className={styles.fieldValue}>
        {value || '–'}
      </Typography>
    </div>
  );
}

/** The shape of the page while the agent loads, so the page does not jump when it arrives. */
function AgentDetailSkeleton() {
  return (
    // English translation: Loading agent
    <div role="status" aria-label="Laster agent" className={styles.page}>
      <div className={styles.backLink}>
        <Skeleton variant="text" width={160} />
      </div>
      <div className={styles.header}>
        <Skeleton variant="circular" width={72} height={72} />
        <div className={styles.skeletonTitle}>
          <Skeleton variant="text" width="70%" height={48} />
          <Skeleton variant="text" width="40%" />
        </div>
      </div>
      <Skeleton variant="rounded" height={88} />
      <Skeleton variant="rounded" height={36} width="60%" className={styles.skeletonBlock} />
      <Skeleton variant="rounded" height={40} className={styles.skeletonBlock} />
      <Skeleton variant="rounded" height={200} className={styles.skeletonBlock} />
    </div>
  );
}
