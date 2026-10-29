'use client';

import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import Typography from '@mui/material/Typography';

import { fetchSavedTemplates } from '@/app/configure/api';
import { AddCatalogCard } from '@/components/templates/AddCatalogCard';
import { CatalogGrid } from '@/components/templates/CatalogGrid';
import { useWorkplaceTemplates } from '@/components/templates/useWorkplaceTemplates';
import { fetchLegalTemplates } from '@/components/legalTemplates/api';
import { fetchProfiles } from '@/components/profiles/api';
import type { AgentTemplate } from '@/data/templates';
import { builtInLegalTemplates } from '@/data/legal-templates';
import type { JobSeekerProfile } from '@/domain/jobSeekerProfile';
import type { LegalTemplate } from '@/domain/legalTemplate';
import { useOnceInBrowser } from '@/lib/useOnceInBrowser';
import {
  industryCatalog,
  jobCatalog,
  legalCatalog,
  profileCatalog,
  savedTemplateCatalog,
  type CatalogItem,
} from '@/domain/templateCatalog';
import {
  PROFILE_CREATED_FLASH,
  PROFILE_SAVED_FLASH,
  TEMPLATE_CREATED_FLASH,
  TEMPLATE_DELETED_FLASH,
  TEMPLATE_SAVED_FLASH,
  takeTemplatesFlash,
} from './flash';
import {
  sectionOpen,
  setSectionOpen,
  subscribeSections,
  type TemplateSectionId,
} from './sectionOpen';
import styles from './TemplateLibrary.module.css';

type ProfileState =
  | { kind: 'loading' }
  | { kind: 'ready'; profiles: JobSeekerProfile[] }
  | { kind: 'error'; message: string };

type LegalState =
  | { kind: 'loading' }
  | { kind: 'ready'; templates: LegalTemplate[] }
  | { kind: 'error'; message: string };

type SavedState =
  | { kind: 'loading' }
  | { kind: 'ready'; templates: AgentTemplate[] }
  | { kind: 'error'; message: string };

const NEW_INTERVJUERMAL_HREF =
  '/create-template?agentType=interviewer&returnTo=' + encodeURIComponent('/templates');

function toastFromFlash(): string | null {
  const flash = takeTemplatesFlash();
  if (flash === TEMPLATE_CREATED_FLASH) return 'Mal laget';
  if (flash === TEMPLATE_SAVED_FLASH) return 'Mal lagret';
  if (flash === TEMPLATE_DELETED_FLASH) return 'Mal slettet';
  if (flash === PROFILE_CREATED_FLASH) return 'Jobbsøkermal laget';
  if (flash === PROFILE_SAVED_FLASH) return 'Jobbsøkermal lagret';
  return null;
}

function Section({
  id,
  title,
  hint,
  children,
}: {
  id: TemplateSectionId;
  title: string;
  /** One short line under the title explaining what this kind of mal is for. */
  hint: string;
  children: ReactNode;
}) {
  const open = useSyncExternalStore(
    subscribeSections,
    () => sectionOpen(id),
    () => true,
  );

  return (
    <Accordion
      expanded={open}
      onChange={(_event, next) => setSectionOpen(id, next)}
      disableGutters
      className={styles.section}
      slotProps={{ heading: { component: 'h2' } }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />} className={styles.summary}>
        <Typography variant="h5" component="span">
          {title}
        </Typography>
      </AccordionSummary>
      <AccordionDetails className={styles.details}>
        <p className={styles.sectionHint}>{hint}</p>
        {children}
      </AccordionDetails>
    </Accordion>
  );
}

/**
 * Templates, job seeker profiles and legal templates, in the same card layout as the agents page.
 * Each group folds shut, so a long list does not have to stay open. Stillingsmaler are the built-in
 * ones plus the counsellor's own, and bransjemaler are the industries they name; saved interviewer
 * templates live under Intervjuermaler.
 */
export function TemplateLibrary() {
  const [profiles, setProfiles] = useState<ProfileState>({ kind: 'loading' });
  const [legal, setLegal] = useState<LegalState>({ kind: 'loading' });
  const [saved, setSaved] = useState<SavedState>({ kind: 'loading' });
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchProfiles(controller.signal)
      .then((loaded) => setProfiles({ kind: 'ready', profiles: loaded }))
      .catch((error: Error) => {
        if (!controller.signal.aborted) setProfiles({ kind: 'error', message: error.message });
      });
    fetchLegalTemplates(controller.signal)
      .then((templates) => setLegal({ kind: 'ready', templates }))
      .catch((error: Error) => {
        if (!controller.signal.aborted) setLegal({ kind: 'error', message: error.message });
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchSavedTemplates('interviewer', controller.signal)
      .then((templates) => setSaved({ kind: 'ready', templates }))
      .catch(() => {
        if (!controller.signal.aborted) {
          setSaved({ kind: 'error', message: 'Noe gikk galt. Prøv igjen.' });
        }
      });
    return () => controller.abort();
  }, []);

  const ownTemplates: CatalogItem[] =
    saved.kind === 'ready' ? savedTemplateCatalog(saved.templates) : [];
  // The built-in ones are shown at once, and the counsellor's own come first when they have loaded.
  const workplace = useWorkplaceTemplates();

  // One-shot flash from the previous page (mal laget / lagret).
  useOnceInBrowser(() => {
    const message = toastFromFlash();
    if (message) setToast(message);
  });

  return (
    <>
      <Section
        id="bransjemaler"
        title="Bransjemaler"
        hint="En bransjemal samler stillinger i samme bransje, for eksempel helse og omsorg."
      >
        {workplace.error && <Alert severity="error">{workplace.error}</Alert>}
        <CatalogGrid
          items={industryCatalog(workplace.jobs)}
          leading={<AddCatalogCard title="Ny bransjemal" subtitle="Kommer snart" />}
        />
      </Section>

      <Section
        id="jobbsokerprofiler"
        title="Jobbsøkermaler"
        hint="En jobbsøkermal beskriver en anonym jobbsøker du øver med, uten ekte personopplysninger."
      >
        {profiles.kind === 'loading' && <Typography>Laster maler …</Typography>}
        {profiles.kind === 'error' && <Alert severity="error">{profiles.message}</Alert>}
        {profiles.kind === 'ready' && (
          <CatalogGrid
            items={profileCatalog(profiles.profiles)}
            leading={
              <AddCatalogCard
                href="/profiles/new"
                title="Ny jobbsøkermal"
                subtitle="Legg til en jobbsøkermal"
              />
            }
          />
        )}
      </Section>

      <Section
        id="stillingsmaler"
        title="Stillingsmaler"
        hint="En stillingsmal fyller inn stilling og bransje når du setter opp en intervjuer."
      >
        {workplace.error && <Alert severity="error">{workplace.error}</Alert>}
        <CatalogGrid
          items={jobCatalog(workplace.jobs)}
          leading={
            <AddCatalogCard
              href="/templates/jobs/new"
              title="Ny stillingsmal"
              subtitle="Legg til en stilling"
            />
          }
        />
      </Section>

      <Section
        id="intervjuermaler"
        title="Intervjuermaler"
        hint="En intervjuermal styrer hvordan intervjueren snakker og hva den legger vekt på."
      >
        {saved.kind === 'loading' && <Typography>Laster egne maler …</Typography>}
        {saved.kind === 'error' && <Alert severity="error">{saved.message}</Alert>}
        {(saved.kind === 'ready' || saved.kind === 'error') && (
          <CatalogGrid
            items={ownTemplates}
            leading={
              <AddCatalogCard
                href={NEW_INTERVJUERMAL_HREF}
                title="Ny intervjuermal"
                subtitle="Lag en mal for intervjueren"
              />
            }
          />
        )}
      </Section>

      <Section
        id="lovverk"
        title="Lovverk"
        hint="Lovverk er regler intervjueren skal følge, for eksempel hva den ikke skal spørre om."
      >
        {/* The built-in templates are shown while the counsellor's own load, or if they can't. */}
        {legal.kind === 'error' && <Alert severity="error">{legal.message}</Alert>}
        <CatalogGrid
          items={legalCatalog([
            ...builtInLegalTemplates,
            ...(legal.kind === 'ready' ? legal.templates : []),
          ])}
          leading={
            <AddCatalogCard
              href="/legal-templates/new"
              title="Nytt lovverk"
              subtitle="Legg til en lov eller regel"
            />
          }
        />
      </Section>

      <Snackbar
        open={toast !== null}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        message={toast ?? ''}
      />
    </>
  );
}
