'use client';

import Link from 'next/link';
import { notFound, useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';

import { DeleteWorkplaceTemplateButton } from '@/components/templates/DeleteWorkplaceTemplateButton';
import {
  BUILT_IN_LABEL,
  TemplateDetail,
  TemplateDetailPage,
  TemplateDetailSkeleton,
} from '@/components/templates/TemplateDetail';
import { useWorkplaceTemplates } from '@/components/templates/useWorkplaceTemplates';
import { deleteIndustryTemplate } from '@/components/templates/workplaceApi';
import { SECTOR_LABELS } from '@/data/industry-templates';
import {
  findIndustry,
  industryHref,
  isBuiltInIndustry,
  jobHref,
  OWN_TEMPLATE_LABEL,
} from '@/domain/templateCatalog';
import { setTemplatesFlash, TEMPLATE_DELETED_FLASH } from '../../flash';

/**
 * One industry and its stillingsmaler, the counsellor's own among them. A built-in industry is
 * shown at once; one the counsellor made is shown when their templates have loaded. A bransjemal
 * the counsellor made has the buttons to edit and delete it.
 */
export function IndustryTemplateView({ slug }: { slug: string }) {
  const router = useRouter();
  const { jobs, industries, loaded, error } = useWorkplaceTemplates();
  const group = findIndustry(jobs, slug, industries);

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

  const { industry, entry } = group;
  const sectors = [...new Set(group.jobs.map((job) => SECTOR_LABELS[job.sector]))];
  const tasks = [...new Set(group.jobs.flatMap((job) => job.tasks))];

  return (
    <TemplateDetail
      title={industry}
      chip={isBuiltInIndustry(group) ? BUILT_IN_LABEL : OWN_TEMPLATE_LABEL}
      // English translation: About the industry
      summary={entry && { label: 'Om bransjen', text: entry.description }}
      actions={
        entry && (
          <>
            <Button component={Link} href={`${industryHref(industry)}/edit`} variant="outlined">
              Rediger
            </Button>
            <DeleteWorkplaceTemplateButton
              name={industry}
              noun="bransjemalen"
              // English translation: The job templates in the industry are not deleted.
              note={
                group.jobs.length > 0 ? 'Stillingsmalene i bransjen blir ikke slettet.' : undefined
              }
              onDelete={() => deleteIndustryTemplate(entry.id)}
              onDeleted={() => {
                setTemplatesFlash(TEMPLATE_DELETED_FLASH);
                router.push('/templates');
              }}
            />
          </>
        )
      }
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
        // English translation: What the interviewer is told about the industry
        ...(entry?.context
          ? [{ label: 'Dette får intervjueren vite om bransjen', text: entry.context, boxed: true }]
          : []),
      ]}
    />
  );
}
