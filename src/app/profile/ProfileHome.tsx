'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Popover from '@mui/material/Popover';
import TextField from '@mui/material/TextField';

import { fetchSavedTemplates } from '@/app/configure/api';
import { fetchAgents } from '@/app/browse-agents/api';
import { AgentStatusChip } from '@/components/agents/AgentStatusChip';
import { agentStatus } from '@/domain/agentStatus';
import { getAgentType } from '@/domain/agentTypes/registry';
import { AVATARS, avatarSrc } from '@/domain/avatars';
import { profileImageUrl, type CounsellorProfile } from '@/domain/counsellorProfile';
import type { AgentTemplate } from '@/data/templates';
import { formatDate } from '@/lib/format';
import { handleSignOut } from '@/lib/auth';
import {
  saveCounsellorProfile,
  useCounsellorProfile,
} from '@/lib/counsellorProfileClient';
import type { Agent } from '@/lib/types';
import styles from './ProfileHome.module.css';

const THEMES = [
  { value: 'light', label: 'Lys' },
  { value: 'dark', label: 'Mørk' },
  { value: 'system', label: 'System' },
] as const;

type Load<T> = { kind: 'loading' } | { kind: 'ready'; items: T[] } | { kind: 'error' };

export function ProfileHome() {
  const { status, profile } = useCounsellorProfile();
  const { theme, setTheme } = useTheme();
  const [agents, setAgents] = useState<Load<Agent>>({ kind: 'loading' });
  const [templates, setTemplates] = useState<Load<AgentTemplate>>({ kind: 'loading' });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<CounsellorProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [picker, setPicker] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (status !== 'authenticated') return;
    const controller = new AbortController();
    fetchAgents()
      .then((items) => {
        if (!controller.signal.aborted) setAgents({ kind: 'ready', items });
      })
      .catch(() => {
        if (!controller.signal.aborted) setAgents({ kind: 'error' });
      });
    fetchSavedTemplates('interviewer', controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) setTemplates({ kind: 'ready', items });
      })
      .catch(() => {
        if (!controller.signal.aborted) setTemplates({ kind: 'error' });
      });
    return () => controller.abort();
  }, [status]);

  if (status === 'loading') return <p className={styles.page}>Laster profil …</p>;
  if (status !== 'authenticated') {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>Min profil</h1>
        <p className={styles.lead}>
          <Link href="/login">Logg inn</Link> for å se kontoen din.
        </p>
      </div>
    );
  }

  const shown = editing && draft ? draft : profile;
  const name = shown.name.trim() || 'Veileder';

  function beginEdit() {
    setDraft(profile);
    setSaveError(null);
    setEditing(true);
  }

  function chooseImage(image: string | null) {
    if (!draft) return;
    setDraft({ ...draft, image });
    setPicker(null);
  }

  async function save() {
    if (!draft) return;
    const next = { name: draft.name.trim(), email: draft.email.trim(), image: draft.image };
    if (!next.name) {
      setSaveError('Skriv inn et brukernavn.');
      return;
    }
    if (!next.email.includes('@')) {
      setSaveError('Skriv inn en e-postadresse.');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await saveCounsellorProfile(next);
      setEditing(false);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Profilen ble ikke lagret. Prøv igjen.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <h1 className={styles.title}>Min profil</h1>
        <p className={styles.lead}>Agentene dine, malene du har laget og kontoen din på ett sted.</p>
      </header>

      <div className={styles.layout}>
        <div className={styles.side}>
          <section className={styles.card} aria-label="Konto">
            <div className={styles.identity}>
              {editing && draft ? (
                <>
                  <button
                    type="button"
                    className={styles.avatarButton}
                    aria-label="Bytt bilde"
                    onClick={(event) => setPicker(event.currentTarget)}
                  >
                    <Portrait name={draft.name} image={draft.image} />
                    <span className={styles.avatarHint}>Bytt bilde</span>
                  </button>
                  <Popover
                    open={picker !== null}
                    anchorEl={picker}
                    onClose={() => setPicker(null)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'center' }}
                  >
                    <div className={styles.picker} role="group" aria-label="Velg bilde">
                      <button
                        type="button"
                        className={styles.choice}
                        aria-pressed={draft.image === null}
                        onClick={() => chooseImage(null)}
                      >
                        <span className={styles.letter}>{initial(draft.name)}</span>
                        Bokstav
                      </button>
                      {AVATARS.map((avatar) => (
                        <button
                          key={avatar.id}
                          type="button"
                          className={styles.choice}
                          aria-pressed={draft.image === avatar.id}
                          onClick={() => chooseImage(avatar.id)}
                        >
                          <span
                            className={styles.choiceImage}
                            style={{ backgroundImage: `url("${avatarSrc(avatar.id)}")` }}
                          />
                          {avatar.label}
                        </button>
                      ))}
                    </div>
                  </Popover>
                </>
              ) : (
                <Portrait name={name} image={profile.image} />
              )}
              {editing && draft ? (
                <TextField
                  label="Brukernavn"
                  value={draft.name}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                  fullWidth
                  disabled={saving}
                />
              ) : (
                <h2 className={styles.name}>{name}</h2>
              )}
              <Chip label="Veileder" size="small" color="secondary" />
            </div>
            {editing && draft ? (
              <TextField
                label="E-post"
                type="email"
                value={draft.email}
                onChange={(event) => setDraft({ ...draft, email: event.target.value })}
                fullWidth
                disabled={saving}
              />
            ) : (
              shown.email && (
                <dl className={styles.facts}>
                  <div>
                    <dt>E-post</dt>
                    <dd>{shown.email}</dd>
                  </div>
                </dl>
              )
            )}
            {saveError && <p className={styles.error}>{saveError}</p>}
            <div className={styles.accountActions}>
              {editing ? (
                <Button variant="contained" onClick={() => void save()} disabled={saving}>
                  {saving ? 'Lagrer …' : 'Lagre'}
                </Button>
              ) : (
                <Button variant="outlined" onClick={beginEdit}>
                  Rediger profil
                </Button>
              )}
              <Button variant="outlined" onClick={() => handleSignOut()} disabled={saving}>
                Logg ut
              </Button>
            </div>
          </section>

          <section className={styles.card} aria-labelledby="settings-heading">
            <h2 id="settings-heading" className={styles.cardTitle}>
              Innstillinger
            </h2>
            <p className={styles.fieldLabel} id="theme-label">
              Tema
            </p>
            <div className={styles.themes} role="group" aria-labelledby="theme-label">
              {THEMES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={theme === option.value ? styles.themeOn : styles.theme}
                  aria-pressed={theme === option.value}
                  onClick={() => setTheme(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <label className={styles.fieldLabel} htmlFor="language">
              Språk
            </label>
            <select id="language" className={styles.language} defaultValue="nb">
              <option value="nb">Norsk bokmål</option>
            </select>
          </section>
        </div>

        <div className={styles.main}>
          <ListCard
            title="Mine agenter"
            action={
              <Button component={Link} href="/configure?type=interviewer" variant="contained">
                Ny agent
              </Button>
            }
          >
            <Rows
              state={agents}
              empty="Du har ingen agenter ennå."
              columns={['Agent', 'Status', 'Sist endret']}
              render={(agent) => (
                <tr key={agent.id}>
                  <th scope="row">
                    <Mark letter={initial(agent.name)} />
                    <Link href={`/browse-agents/${encodeURIComponent(agent.id)}`}>{agent.name}</Link>
                  </th>
                  <td>
                    <AgentStatusChip status={agentStatus(agent)} />
                  </td>
                  <td>{when(agent.lastUpdated)}</td>
                  <td className={styles.rowActions}>
                    <Button
                      component={Link}
                      href={`/browse-agents/${encodeURIComponent(agent.id)}`}
                      size="small"
                      variant="outlined"
                    >
                      Åpne
                    </Button>
                    <Button
                      component={Link}
                      href={`/test-chat?agent=${encodeURIComponent(agent.id)}`}
                      size="small"
                      variant="outlined"
                    >
                      Test
                    </Button>
                  </td>
                </tr>
              )}
            />
          </ListCard>

          <ListCard
            title="Mine maler"
            action={
              <Button
                component={Link}
                href="/create-template?agentType=interviewer"
                variant="outlined"
              >
                Lag ny mal
              </Button>
            }
          >
            <Rows
              state={templates}
              empty="Du har ingen egne maler ennå."
              columns={['Mal', 'Type']}
              render={(template) => (
                <tr key={template.id}>
                  <th scope="row">
                    <Mark letter={initial(template.title)} />
                    <Link href={`/templates/${encodeURIComponent(template.id)}/edit`}>
                      {template.title}
                    </Link>
                  </th>
                  <td>
                    <Chip
                      label={getAgentType(template.agentType)?.label ?? template.agentType}
                      size="small"
                      variant="outlined"
                    />
                  </td>
                  <td className={styles.rowActions}>
                    <Button
                      component={Link}
                      href={`/templates/${encodeURIComponent(template.id)}/edit`}
                      size="small"
                      variant="outlined"
                    >
                      Åpne
                    </Button>
                  </td>
                </tr>
              )}
            />
          </ListCard>
        </div>
      </div>
    </div>
  );
}

function ListCard({
  title,
  action,
  children,
}: {
  title: string;
  action: ReactNode;
  children: ReactNode;
}) {
  const id = title.toLowerCase().replaceAll(' ', '-');
  return (
    <section className={styles.card} aria-labelledby={id}>
      <div className={styles.cardHead}>
        <h2 id={id} className={styles.cardTitle}>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Rows<T>({
  state,
  empty,
  columns,
  render,
}: {
  state: Load<T>;
  empty: string;
  columns: string[];
  render: (item: T) => ReactNode;
}) {
  if (state.kind === 'loading') return <p className={styles.note}>Laster …</p>;
  if (state.kind === 'error') return <p className={styles.note}>Kunne ikke hente listen.</p>;
  if (state.items.length === 0) return <p className={styles.note}>{empty}</p>;
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column} scope="col">
                {column}
              </th>
            ))}
            <th scope="col">
              <span className={styles.srOnly}>Handlinger</span>
            </th>
          </tr>
        </thead>
        <tbody>{state.items.map(render)}</tbody>
      </table>
    </div>
  );
}

function Portrait({ name, image }: { name: string; image: string | null }) {
  const url = profileImageUrl(image);
  return (
    <span
      className={styles.avatar}
      style={url ? { backgroundImage: `url("${url}")` } : undefined}
      aria-hidden="true"
    >
      {url ? null : initial(name)}
    </span>
  );
}

function Mark({ letter }: { letter: string }) {
  return (
    <span className={styles.mark} aria-hidden="true">
      {letter}
    </span>
  );
}

function initial(name: string): string {
  const letter = name.trim().charAt(0);
  return letter ? letter.toUpperCase() : '?';
}

function when(iso: string): string {
  return Number.isNaN(new Date(iso).getTime()) ? '—' : formatDate(iso);
}
