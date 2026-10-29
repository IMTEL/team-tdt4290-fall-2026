import Typography from '@mui/material/Typography';

import { ScrollArea } from '@/components/ui/ScrollArea';
import type { AnswerEffect } from '@/domain/agentTypes/types';
import styles from './AnswerEffects.module.css';

type AnswerEffectsProps = {
  effects: AnswerEffect[];
  /** True when the counsellor wrote the system prompt by hand, so the answers change nothing. */
  customPrompt: boolean;
};

/** Which of the counsellor's answers change how the agent behaves, and how. */
export function AnswerEffects({ effects, customPrompt }: AnswerEffectsProps) {
  if (customPrompt) {
    return (
      <Typography variant="body2" color="text.secondary">
        {/* English translation: The system prompt is written by hand, so the answers do not change how the agent behaves. */}
        Systemprompten er skrevet for hånd, så svarene endrer ikke hvordan agenten oppfører seg.
      </Typography>
    );
  }

  return (
    <ScrollArea className={styles.area}>
      <dl className={styles.list}>
        {effects.map(({ key, label, effects: lines }) => (
          <div key={key}>
            <Typography component="dt" variant="subtitle2">
              {label}
            </Typography>
            <Typography component="dd" variant="body2" sx={{ m: 0 }}>
              {lines.length === 1 ? (
                lines[0]
              ) : (
                <ul className={styles.effects}>
                  {lines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              )}
            </Typography>
          </div>
        ))}
      </dl>
    </ScrollArea>
  );
}
