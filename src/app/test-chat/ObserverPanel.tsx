'use client';

import { useEffect, useRef, useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';

import type { ChatMessage } from '@/components/chat/types';
import type { ObserverFeedback, ObserverPoint } from '@/domain/observerFeedback';
import { requestObserverFeedback } from './api';
import styles from './ObserverPanel.module.css';

type ObserverPanelProps = {
  /** The test chat so far. */
  messages: ChatMessage[];
  /** True while the interviewer is answering or its reply failed: the chat is not ready to judge. */
  disabled: boolean;
};

type ObserverState =
  | { step: 'idle' }
  | { step: 'loading' }
  | { step: 'ready'; feedback: ObserverFeedback }
  | { step: 'error'; message: string };

/**
 * Lets the counsellor ask the observer for feedback on the test chat, and shows it: what went well
 * and what can be better, each with the candidate's words and a tip. Mount a new one (a new key)
 * to clear it when the chat starts over.
 */
export function ObserverPanel({ messages, disabled }: ObserverPanelProps) {
  const [state, setState] = useState<ObserverState>({ step: 'idle' });
  const requestRef = useRef<AbortController | null>(null);

  // Cancel a request still on its way when the chat starts over or the user leaves.
  useEffect(() => () => requestRef.current?.abort(), []);

  async function ask() {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setState({ step: 'loading' });
    try {
      const feedback = await requestObserverFeedback(messages, controller.signal);
      setState({ step: 'ready', feedback });
    } catch (error) {
      if (controller.signal.aborted) return;
      setState({ step: 'error', message: (error as Error).message });
    }
  }

  const loading = state.step === 'loading';

  return (
    <section aria-labelledby="observer-heading" className={styles.panel}>
      <div className={styles.header}>
        {/* English translation: Feedback */}
        <Typography id="observer-heading" variant="h6" component="h2">
          Tilbakemelding
        </Typography>
        <Button variant="contained" size="small" onClick={ask} disabled={disabled || loading}>
          {/* English translation: Ask for feedback / Ask for new feedback */}
          {state.step === 'ready' ? 'Be om ny tilbakemelding' : 'Be om tilbakemelding'}
        </Button>
      </div>

      {state.step === 'idle' && (
        <Typography variant="body2" className={styles.muted}>
          {/* English translation: When the interview is done, an observer can read it and tell
          the job seeker what went well and what can be better. */}
          Når intervjuet er ferdig, kan en observatør lese det og fortelle jobbsøkeren hva som gikk
          bra og hva som kan bli bedre.
        </Typography>
      )}

      {loading && (
        <Typography variant="body2" role="status">
          {/* English translation: The observer is reading the interview … */}
          Observatøren leser intervjuet …
        </Typography>
      )}

      {state.step === 'error' && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={ask} disabled={disabled}>
              {/* English translation: Try again */}
              Prøv igjen
            </Button>
          }
        >
          {state.message}
        </Alert>
      )}

      {state.step === 'ready' && state.feedback.kind === 'too-short' && (
        <Alert severity="info">{state.feedback.reason}</Alert>
      )}

      {state.step === 'ready' && state.feedback.kind === 'feedback' && (
        <>
          {/* English translation: This went well */}
          <PointList title="Dette gikk bra" points={state.feedback.wentWell} />
          {/* English translation: This can be better */}
          <PointList title="Dette kan bli bedre" points={state.feedback.toImprove} />
        </>
      )}
    </section>
  );
}

function PointList({ title, points }: { title: string; points: ObserverPoint[] }) {
  if (points.length === 0) return null;
  return (
    <Paper component="section" variant="outlined" aria-label={title} className={styles.points}>
      <Typography variant="subtitle1" component="h3">
        {title}
      </Typography>
      <ul className={styles.list}>
        {points.map((point, i) => (
          <li key={i} className={styles.point}>
            <blockquote className={styles.quote}>«{point.quote}»</blockquote>
            <Typography variant="body2">{point.comment}</Typography>
            <Typography variant="body2">
              {/* English translation: Tip: */}
              <strong>Tips:</strong> {point.tip}
            </Typography>
          </li>
        ))}
      </ul>
    </Paper>
  );
}
