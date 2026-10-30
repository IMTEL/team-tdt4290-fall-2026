'use client';

import { notFound, useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';

import { IndustryTemplateForm } from '@/components/templates/IndustryTemplateForm';
import { useWorkplaceTemplates } from '@/components/templates/useWorkplaceTemplates';
import { updateIndustryTemplate, updateJobTemplate } from '@/components/templates/workplaceApi';
import { findIndustry, industryHref, industrySlug } from '@/domain/templateCatalog';
import { industryNames, isBuiltInJob } from '@/domain/workplaceTemplate';
import { setTemplatesFlash, TEMPLATE_SAVED_FLASH } from '../../../flash';
import styles from '../../../formPage.module.css';

/**
 * Shows the form for one of the counsellor's bransjemaler. A new name is given to their own
 * stillingsmaler in the industry as well, so they stay in it.
 */
export function EditIndustryTemplate({ slug }: { slug: string }) {
  const router = useRouter();
  const { jobs, industries, loaded, error } = useWorkplaceTemplates();
  const group = findIndustry(jobs, slug, industries);
  const entry = group?.entry;

  // Built-in industries and those only named by a stillingsmal have no bransjemal to edit.
  if (loaded && !error && !entry) notFound();

  const otherNames = industryNames(jobs, industries).filter((name) => industrySlug(name) !== slug);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Rediger bransjemal</h1>
        <p className={styles.lead}>
          {/* English translation: Changes apply to interviewers you set up from now on.
          Interviewers you have already saved stay as they are. */}
          Endringene gjelder intervjuere du setter opp fra nå av. Intervjuere du allerede har
          lagret, blir som de er.
        </p>
      </header>

      {!loaded && <p>Laster bransjemal …</p>}
      {error && <Alert severity="error">{error}</Alert>}
      {entry && group && (
        <IndustryTemplateForm
          initial={entry}
          takenNames={otherNames}
          cancelHref={industryHref(entry.name)}
          onSave={async (template) => {
            await updateIndustryTemplate(entry.id, template);
            if (template.name !== entry.name) {
              const own = group.jobs.filter((job) => !isBuiltInJob(job.id));
              await Promise.all(
                own.map(({ id, ...job }) =>
                  updateJobTemplate(id, { ...job, industry: template.name }),
                ),
              );
            }
            setTemplatesFlash(TEMPLATE_SAVED_FLASH);
            router.push('/templates');
          }}
        />
      )}
    </div>
  );
}
