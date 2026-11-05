'use client';

import { useEffect, useRef, useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';

import type { ChatMessage } from '@/components/chat/types';
import {
  evaluatedTurns,
  hasManyEvaluations,
  summarizeObserverFeedback,
  type EvaluatedTurn,
  type FeedbackKind,
  type ObserverFeedback,
  type ObserverPoint,
} from '@/domain/observerFeedback';
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
 * Lets the counsellor ask the observer for feedback on the test chat, and shows it: each point as
 * the question that was asked and how the answer was judged. Many points also get a short summary
 * above the list. Mount a new one (a new key) to clear it when the chat starts over.
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
        <FeedbackView feedback={state.feedback} messages={messages} />
      )}
    </section>
  );
}

function FeedbackView({
  feedback,
  messages,
}: {
  feedback: Extract<ObserverFeedback, { kind: 'feedback' }>;
  messages: ChatMessage[];
}) {
  const turns = evaluatedTurns(feedback, messages);

  return (
    <>
      {hasManyEvaluations(feedback) && (
        <Paper
          component="section"
          variant="outlined"
          aria-label="Sammendrag"
          className={styles.points}
        >
          {/* English translation: Summary */}
          <Typography variant="subtitle1" component="h3">
            Sammendrag
          </Typography>
          <Typography variant="body2">{summarizeObserverFeedback(feedback)}</Typography>
        </Paper>
      )}
      <ol className={styles.list}>
        {turns.map((turn, index) => (
          <li key={index}>
            <QuestionEvaluation turn={turn} />
          </li>
        ))}
      </ol>
    </>
  );
}

function QuestionEvaluation({ turn }: { turn: EvaluatedTurn }) {
  return (
    <Paper
      component="article"
      variant="outlined"
      aria-label="Spørsmål og vurdering"
      className={styles.points}
    >
      {turn.question && (
        <div className={styles.part}>
          {/* English translation: The question that was asked */}
          <Typography variant="subtitle2" component="h3">
            Spørsmålet som ble stilt
          </Typography>
          <blockquote className={styles.question}>{turn.question}</blockquote>
        </div>
      )}
      <div className={styles.part}>
        {/* English translation: How it was judged */}
        <Typography variant="subtitle2" component="h3">
          Slik ble det vurdert
        </Typography>
        {turn.items.map((item, index) => (
          <Judgement key={index} kind={item.kind} point={item.point} />
        ))}
      </div>
    </Paper>
  );
}

function Judgement({ kind, point }: { kind: FeedbackKind; point: ObserverPoint }) {
  return (
    <div className={styles.judgement}>
      <Typography variant="body2" className={styles.kind}>
        {/* English translation: Went well / Can be better */}
        {kind === 'wentWell' ? 'Gikk bra' : 'Kan bli bedre'}
      </Typography>
      <blockquote className={styles.quote}>«{point.quote}»</blockquote>
      <Typography variant="body2">{point.comment}</Typography>
      <Typography variant="body2">
        {/* English translation: Tip: */}
        <strong>Tips:</strong> {point.tip}
      </Typography>
    </div>
  );
}
