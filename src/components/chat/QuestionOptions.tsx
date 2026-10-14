'use client';

import { useState, type FormEvent } from 'react';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import TextField from '@mui/material/TextField';

import {
  formatAnswer,
  SKIP_ANSWER,
  type Choice,
  type QuestionOptions as Options,
} from '@/domain/questionOptions';
import styles from './QuestionOptions.module.css';

type QuestionOptionsProps = {
  options: Options;
  /** Called with the answer as a chat message, e.g. "1. HR, 3. Kollega. Annet: …". */
  onAnswer: (text: string) => void;
  /** The user can't answer while the agent is answering. */
  disabled?: boolean;
};

/**
 * The answers to a question as things to click: buttons that answer at once when one answer is
 * allowed, checkboxes when several are. With options there is always a field for an answer that
 * is not in the list. An optional question also gets a "Hopp over" button.
 */
export function QuestionOptions({ options, onAnswer, disabled = false }: QuestionOptionsProps) {
  // The numbers of the ticked options. Numbers, not Choice objects: the options are parsed again
  // on every render of the chat, so the objects are new each time.
  const [chosen, setChosen] = useState<number[]>([]);
  const [other, setOther] = useState('');
  const canSend = !disabled && (chosen.length > 0 || other.trim() !== '');
  const hasChoices = options.choices.length > 0;

  function toggle({ number }: Choice) {
    setChosen((current) =>
      current.includes(number) ? current.filter((n) => n !== number) : [...current, number],
    );
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSend) return;
    // Keep the agent's order, not the order the boxes were ticked in.
    onAnswer(
      formatAnswer(
        options.choices.filter((c) => chosen.includes(c.number)),
        other,
      ),
    );
  }

  return (
    <form onSubmit={handleSubmit} className={styles.options} aria-label="Svaralternativer">
      {hasChoices && options.multiple && (
        <div className={styles.checkboxes}>
          {options.choices.map((choice) => (
            <FormControlLabel
              key={choice.number}
              label={`${choice.number}. ${choice.label}`}
              disabled={disabled}
              control={
                <Checkbox
                  checked={chosen.includes(choice.number)}
                  onChange={() => toggle(choice)}
                />
              }
            />
          ))}
        </div>
      )}
      {hasChoices && !options.multiple && (
        <div className={styles.buttons}>
          {options.choices.map((choice) => (
            <Button
              key={choice.number}
              variant="pill"
              disabled={disabled}
              onClick={() => onAnswer(formatAnswer([choice]))}
            >
              <span className={styles.number}>{choice.number}.</span> {choice.label}
            </Button>
          ))}
        </div>
      )}
      {hasChoices && (
        <div className={styles.other}>
          <TextField
            size="small"
            className={styles.otherField}
            value={other}
            disabled={disabled}
            onChange={(e) => setOther(e.target.value)}
            placeholder="Annet svar …"
            slotProps={{ htmlInput: { 'aria-label': 'Annet svar' } }}
          />
          <Button type="submit" variant="contained" size="small" disabled={!canSend}>
            Send svar
          </Button>
        </div>
      )}
      {options.skippable && (
        <Button
          variant="pill"
          disabled={disabled}
          onClick={() => onAnswer(SKIP_ANSWER)}
          startIcon={<SkipNextIcon />}
          className={styles.skip}
        >
          Hopp over
        </Button>
      )}
    </form>
  );
}
