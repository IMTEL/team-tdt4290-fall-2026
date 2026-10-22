'use client';

import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';

import { AddCatalogCard } from '@/components/templates/AddCatalogCard';
import { CatalogGrid } from '@/components/templates/CatalogGrid';
import { fetchProfiles } from '@/components/profiles/api';
import { industryTemplates } from '@/data/industry-templates';
import type { JobSeekerProfile } from '@/domain/jobSeekerProfile';
import {
  industryCatalog,
  jobCatalog,
  profileCatalog,
  type CatalogItem,
} from '@/domain/templateCatalog';
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
 * Templates and job seeker profiles, in the same card layout as the agents page. Each group folds
 * shut, so a long list does not have to stay open.
 */
export function TemplateLibrary() {
  const [profiles, setProfiles] = useState<ProfileState>({ kind: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    fetchProfiles(controller.signal)
      .then((loaded) => setProfiles({ kind: 'ready', profiles: loaded }))
      .catch((error: Error) => {
        if (!controller.signal.aborted) setProfiles({ kind: 'error', message: error.message });
      });
    return () => controller.abort();
  }, []);

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

      <BuiltInSection
        id="stillingsmaler"
        title="Stillingsmaler"
        items={jobCatalog(industryTemplates)}
        leading={
          <AddCatalogCard
            href="/create-template?agentType=interviewer"
            title="Ny stillingsmal"
            subtitle="Lag en mal for stillingen"
          />
        }
      />
    </>
  );
}
