/**
 * @deprecated Import from `@/data/job-templates` instead. Stillingsmaler used to live here under
 * the name IndustryTemplate; that type is now JobTemplate.
 */
export {
  SECTOR_LABELS,
  builtInJobTemplates,
  builtInJobTemplates as industryTemplates,
  findJobTemplate,
  findJobTemplate as findIndustryTemplate,
  jobConfiguration,
  jobConfiguration as industryConfiguration,
  type JobTemplate,
  type JobTemplate as IndustryTemplate,
  type Sector,
} from './job-templates';
