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
import { fetchLegalTemplates } from '@/components/legalTemplates/api';
import { fetchProfiles } from '@/components/profiles/api';
import type { AgentTemplate } from '@/data/templates';
import { industryTemplates } from '@/data/industry-templates';
import { builtInLegalTemplates } from '@/data/legal-templates';
import type { JobSeekerProfile } from '@/domain/jobSeekerProfile';
import type { LegalTemplate } from '@/domain/legalTemplate';
import {
  industryCatalog,
  jobCatalog,
  legalCatalog,
  profileCatalog,
  savedTemplateCatalog,
  type CatalogItem,
} from '@/domain/templateCatalog';
import { TEMPLATE_CREATED_FLASH, TEMPLATE_SAVED_FLASH, takeTemplatesFlash } from './flash';
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

const NEW_STILLINGSMAL_HREF =
  '/create-template?agentType=interviewer&returnTo=' + encodeURIComponent('/templates');

/** True after hydration, so sessionStorage flash can be read without a mismatch. */
function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

function toastFromFlash(): string | null {
  const flash = takeTemplatesFlash();
  if (flash === TEMPLATE_CREATED_FLASH) return 'Mal laget';
  if (flash === TEMPLATE_SAVED_FLASH) return 'Mal lagret';
  return null;
}

function Section({
  id,
  title,
  children,
}: {
  id: TemplateSectionId;
  title: string;
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
      <AccordionDetails className={styles.details}>{children}</AccordionDetails>
    </Accordion>
  );
}

function BuiltInSection({
  id,
  title,
  items,
  leading,
}: {
  id: TemplateSectionId;
  title: string;
  items: CatalogItem[];
  leading?: ReactNode;
}) {
  return (
    <Section id={id} title={title}>
      <CatalogGrid items={items} leading={leading} />
    </Section>
  );
}

/**
 * Templates, job seeker profiles and legal templates, in the same card layout as the agents page.
 * Each group folds shut, so a long list does not have to stay open. Saved interviewer templates sit
 * with the built-in stillingsmaler, because that is where «Ny stillingsmal» creates them.
 */
export function TemplateLibrary() {
  const isClient = useIsClient();
  const [profiles, setProfiles] = useState<ProfileState>({ kind: 'loading' });
  const [legal, setLegal] = useState<LegalState>({ kind: 'loading' });
  const [saved, setSaved] = useState<SavedState>({ kind: 'loading' });
  const [toast, setToast] = useState<string | null>(null);
  const [flashSeen, setFlashSeen] = useState(false);

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
  const builtInJobs = jobCatalog(industryTemplates);

  if (isClient && !flashSeen) {
    setFlashSeen(true);
    const message = toastFromFlash();
    if (message) setToast(message);
  }

  return (
    <>
      <BuiltInSection
        id="bransjemaler"
        title="Bransjemaler"
        items={industryCatalog(industryTemplates)}
        leading={<AddCatalogCard title="Ny bransjemal" subtitle="Kommer snart" />}
      />

      <Section id="jobbsokerprofiler" title="Jobbsøkermaler">
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

      <Section id="stillingsmaler" title="Stillingsmaler">
        {saved.kind === 'loading' && <Typography>Laster egne maler …</Typography>}
        {saved.kind === 'error' && <Alert severity="error">{saved.message}</Alert>}
        {(saved.kind === 'ready' || saved.kind === 'error') && (
          <div className={styles.group}>
            <p className={styles.groupTitle}>Dine maler</p>
            <CatalogGrid
              items={ownTemplates}
              leading={
                <AddCatalogCard
                  href={NEW_STILLINGSMAL_HREF}
                  title="Ny stillingsmal"
                  subtitle="Lag en mal for stillingen"
                />
              }
            />
          </div>
        )}
        <div className={styles.group}>
          <p className={styles.groupTitle}>Ferdige maler</p>
          <CatalogGrid items={builtInJobs} />
        </div>
      </Section>

      <Section id="lovverk" title="Lovverk">
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
