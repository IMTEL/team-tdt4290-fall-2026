'use client';

import { notFound } from 'next/navigation';
import Alert from '@mui/material/Alert';

import {
  BUILT_IN_LABEL,
  TemplateDetail,
  TemplateDetailPage,
  TemplateDetailSkeleton,
} from '@/components/templates/TemplateDetail';
import { useWorkplaceTemplates } from '@/components/templates/useWorkplaceTemplates';
import { SECTOR_LABELS } from '@/data/industry-templates';
import {
  findIndustry,
  isBuiltInIndustry,
  jobHref,
  OWN_TEMPLATE_LABEL,
} from '@/domain/templateCatalog';

/**
 * One industry and its stillingsmaler, the counsellor's own among them. A built-in industry is
 * shown at once; one only the counsellor's own stillingsmaler name is shown when they have loaded.
 * Industries come from the stillingsmaler, so there is nothing here to edit or delete.
 */
export function IndustryTemplateView({ slug }: { slug: string }) {
  const { jobs, loaded, error } = useWorkplaceTemplates();
  const group = findIndustry(jobs, slug);

  if (!group) {
    if (loaded && !error) notFound();
    return (
      <TemplateDetailPage>
        {/* English translation: Loading industry template */}
        {!loaded && <TemplateDetailSkeleton label="Laster bransjemal" />}
        {error && <Alert severity="error">{error}</Alert>}
      </TemplateDetailPage>
    );
  }

  const sectors = [...new Set(group.jobs.map((job) => SECTOR_LABELS[job.sector]))];
  const tasks = [...new Set(group.jobs.flatMap((job) => job.tasks))];

  return (
    <TemplateDetail
      title={group.industry}
      chip={isBuiltInIndustry(group) ? BUILT_IN_LABEL : OWN_TEMPLATE_LABEL}
      fields={[
        // English translation: Employer
        { label: 'Arbeidsgiver', text: sectors.join(', ') },
        // English translation: Job templates in the industry
        {
          label: 'Stillingsmaler i bransjen',
          links: group.jobs.map((job) => ({ href: jobHref(job.id), label: job.title })),
        },
        // English translation: Typical tasks
        { label: 'Typiske oppgaver', chips: tasks },
      ]}
    />
  );
}
