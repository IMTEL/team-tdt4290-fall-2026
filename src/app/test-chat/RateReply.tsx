'use client';

import { useEffect, useRef, useState } from 'react';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import ThumbDownOutlinedIcon from '@mui/icons-material/ThumbDownOutlined';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbUpOutlinedIcon from '@mui/icons-material/ThumbUpOutlined';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { FEEDBACK_LIMITS, type Rating } from '@/domain/messageFeedback';
import { rateReply, undoRating } from './api';
import styles from './RateReply.module.css';

type RateReplyProps = {
  agentId: string;
  /** The agent's reply being rated. */
  reply: string;
  /** The user message the reply answered. */
  userMessage: string;
};

// Unrated → a thumb opens the comment field → saving → saved, where "Angre" deletes the rating.
// A failed save goes back to the comment field and a failed undo back to saved, with the error.
type RateState =
  | { step: 'unrated' }
  | { step: 'commenting'; rating: Rating; error?: string }
  | { step: 'saving'; rating: Rating }
  | { step: 'saved'; rating: Rating; feedbackId: string; error?: string }
  | { step: 'undoing'; rating: Rating; feedbackId: string };

/**
 * Lets the counsellor rate one reply in the test chat, with an optional comment. RAGdoll adds the
 * newest ratings to the agent's prompt, so the rating shapes the agent's next reply.
 */
export function RateReply({ agentId, reply, userMessage }: RateReplyProps) {
  const [state, setState] = useState<RateState>({ step: 'unrated' });
  const [comment, setComment] = useState('');

  const rating = state.step === 'unrated' ? null : state.rating;
  const busy = state.step === 'saving' || state.step === 'undoing';

  function choose(next: Rating) {
    setState({ step: 'commenting', rating: next });
  }

  function cancel() {
    setComment('');
    setState({ step: 'unrated' });
  }

  async function save(chosen: Rating) {
    setState({ step: 'saving', rating: chosen });
    try {
      const saved = await rateReply(agentId, {
        rating: chosen,
        agentMessage: reply,
        userMessage,
        comment,
      });
      setState({ step: 'saved', rating: chosen, feedbackId: saved.id });
    } catch (error) {
      setState({ step: 'commenting', rating: chosen, error: (error as Error).message });
    }
  }

  async function undo(chosen: Rating, feedbackId: string) {
    setState({ step: 'undoing', rating: chosen, feedbackId });
    try {
      await undoRating(agentId, feedbackId);
      setComment('');
      setState({ step: 'unrated' });
    } catch (error) {
      setState({ step: 'saved', rating: chosen, feedbackId, error: (error as Error).message });
    }
  }

  const isSaved = state.step === 'saved' || state.step === 'undoing';
  const error = state.step === 'commenting' || state.step === 'saved' ? state.error : undefined;
  const statusText =
    state.step === 'saving'
      ? // English translation: Saving …
        'Lagrer …'
      : isSaved
        ? // English translation: Rated as good / Rated as bad
          rating === 'good'
          ? 'Vurdert som bra'
          : 'Vurdert som dårlig'
        : null;

  // The chat only scrolls for new messages. Under the newest reply, the comment field or an error
  // can open below the visible part of the chat, so bring it into view.
  const rootRef = useRef<HTMLDivElement>(null);
  const opened = state.step === 'commenting';
  useEffect(() => {
    if (opened || error) rootRef.current?.scrollIntoView?.({ block: 'nearest' });
  }, [opened, error]);

  return (
    <div ref={rootRef} className={styles.rateReply}>
      {/* English translation: Rate the reply */}
      <div role="group" aria-label="Vurder svaret" className={styles.row}>
        {/* Once saved, only the chosen thumb is shown, as a plain icon: it can only be undone. */}
        {isSaved ? (
          <span className={styles.savedIcon} aria-hidden="true">
            {rating === 'good' ? (
              <ThumbUpIcon fontSize="small" />
            ) : (
              <ThumbDownIcon fontSize="small" />
            )}
          </span>
        ) : (
          <>
            {/* English translation: Good */}
            <IconButton
              size="small"
              aria-label="Bra"
              aria-pressed={rating === 'good'}
              disabled={busy}
              onClick={() => choose('good')}
              color={rating === 'good' ? 'primary' : 'default'}
            >
              {rating === 'good' ? (
                <ThumbUpIcon fontSize="inherit" />
              ) : (
                <ThumbUpOutlinedIcon fontSize="inherit" />
              )}
            </IconButton>
            {/* English translation: Bad */}
            <IconButton
              size="small"
              aria-label="Dårlig"
              aria-pressed={rating === 'bad'}
              disabled={busy}
              onClick={() => choose('bad')}
              color={rating === 'bad' ? 'primary' : 'default'}
            >
              {rating === 'bad' ? (
                <ThumbDownIcon fontSize="inherit" />
              ) : (
                <ThumbDownOutlinedIcon fontSize="inherit" />
              )}
            </IconButton>
          </>
        )}
        <Typography component="span" role="status" variant="body2">
          {/* The text sits in its own keyed span, never as a bare text node: browser translation
              replaces bare text nodes, and React then fails to remove them ("removeChild"). */}
          {statusText && <span key={statusText}>{statusText}</span>}
        </Typography>
        {isSaved && (
          <Button
            size="small"
            disabled={busy}
            onClick={() => state.step === 'saved' && undo(state.rating, state.feedbackId)}
          >
            {/* English translation: Undo */}
            Angre
          </Button>
        )}
      </div>

      {(state.step === 'commenting' || state.step === 'saving') && (
        <form
          className={styles.form}
          onSubmit={(event) => {
            event.preventDefault();
            if (state.step === 'commenting') void save(state.rating);
          }}
        >
          <TextField
            // English translation: Comment (optional)
            label="Kommentar (valgfritt)"
            // English translation: What was good or what should the interviewer do differently?
            placeholder="Hva var bra, eller hva bør intervjueren gjøre annerledes?"
            size="small"
            fullWidth
            multiline
            maxRows={4}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            disabled={busy}
            slotProps={{ htmlInput: { maxLength: FEEDBACK_LIMITS.comment } }}
          />
          <div className={styles.actions}>
            <Button type="submit" size="small" variant="contained" disabled={busy}>
              {/* English translation: Send */}
              Send
            </Button>
            <Button size="small" onClick={cancel} disabled={busy}>
              {/* English translation: Cancel */}
              Avbryt
            </Button>
          </div>
        </form>
      )}

      {error && (
        <Typography role="alert" variant="body2" color="error">
          {error}
        </Typography>
      )}
    </div>
  );
}
