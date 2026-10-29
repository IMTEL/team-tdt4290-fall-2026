import { savedTemplateRoutes } from '@/server/savedTemplateRoutes';
import { jobTemplateKind } from '@/server/workplaceTemplateMapper';

/** One of the logged-in counsellor's own stillingsmaler: read, replace or delete it. */
export const { GET, PUT, DELETE } = savedTemplateRoutes(jobTemplateKind);
