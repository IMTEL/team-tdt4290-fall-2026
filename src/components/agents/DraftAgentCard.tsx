'use client';

import { useState } from 'react';
import Link from 'next/link';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';

import {
  clearWizardDraft,
  configureDraftHref,
  type WizardDraft,
} from '@/app/configure/wizardDraft';
import { SECTIONS } from '@/app/configure/StillingStep';
import { suggestedAgentName } from '@/app/configure/wizardConfiguration';
import { AgentAvatar } from './AgentAvatar';
import { AgentStatusChip } from './AgentStatusChip';
import styles from './AgentCard.module.css';

/**
 * A local unfinished interviewer, shown like an agent with an «Utkast» pill. Opens the wizard
 * where the counsellor left off. Delete sits outside the link, like «Test agenten» on real cards.
 */
export function DraftAgentCard({
  draft,
  onDeleted,
}: {
  draft: WizardDraft;
  onDeleted?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const name = suggestedAgentName(draft.workplace.jobTitle);
  const step = SECTIONS[Math.min(draft.wizardStep, SECTIONS.length - 1)] ?? 'Utkast';
  const job = draft.workplace.jobTitle.trim();

  function confirmDelete() {
    clearWizardDraft(draft.id);
    setOpen(false);
    onDeleted?.();
  }

  return (
    <Card variant="outlined" className={styles.card}>
      <CardActionArea
        component={Link}
        href={configureDraftHref(draft.id)}
        className={styles.action}
      >
        <CardContent className={styles.content}>
          <AgentAvatar avatar={draft.avatar} size={44} className={styles.avatar} />
          <div className={styles.titleRow}>
            <Typography variant="subtitle1" component="h3" className={styles.title}>
              {name}
            </Typography>
            <span className={styles.status}>
              <AgentStatusChip status="draft" />
            </span>
          </div>
          {job && <Typography className={styles.interviewer}>{job}</Typography>}
          <Typography className={styles.detail}>Fortsett fra: {step}</Typography>
        </CardContent>
      </CardActionArea>
      <CardActions className={styles.actions}>
        <Button
          type="button"
          size="small"
          color="error"
          aria-label={`Slett utkastet ${name}`}
          onClick={() => setOpen(true)}
        >
          Slett
        </Button>
      </CardActions>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Slette utkastet «{name}»?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Utkastet blir borte for godt. Lagrede agenter påvirkes ikke.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Avbryt</Button>
          <Button color="error" variant="contained" onClick={confirmDelete}>
            Slett
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
