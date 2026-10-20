'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AddIcon from '@mui/icons-material/Add';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';

import { listAccessibleAgentTypes, listPlannedAgentTypes } from '@/domain/agentTypes/registry';
import { AgentTypePicker } from './AgentTypePicker';
import styles from './NewAgentCard.module.css';

const DIALOG_TITLE_ID = 'new-agent-dialog-title';

/**
 * The first card on the agents page. Choosing a type in the dialog opens the configurator with
 * that type already chosen.
 */
export function NewAgentCard() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Card variant="outlined" className={styles.card}>
        <CardActionArea onClick={() => setOpen(true)} className={styles.action}>
          {/* Centering lives on an inner element. MUI's own styles load after the module and
              reset alignment on the action area itself. */}
          <span className={styles.inner}>
            <span className={styles.plus} aria-hidden="true">
              <AddIcon fontSize="inherit" />
            </span>
            <Typography variant="subtitle1" component="h3" className={styles.title}>
              Ny agent
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Sett opp en ny intervjuer
            </Typography>
          </span>
        </CardActionArea>
      </Card>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        aria-labelledby={DIALOG_TITLE_ID}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle id={DIALOG_TITLE_ID}>Hva slags agent vil du sette opp?</DialogTitle>
        <DialogContent>
          <AgentTypePicker
            types={listAccessibleAgentTypes()}
            planned={listPlannedAgentTypes()}
            labelledBy={DIALOG_TITLE_ID}
            onSelect={(definition) => {
              router.push(`/configure?type=${encodeURIComponent(definition.id)}`);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
