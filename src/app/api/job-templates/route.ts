import { savedTemplateListRoutes } from '@/server/savedTemplateRoutes';
import { jobTemplateKind } from '@/server/workplaceTemplateMapper';

/** The logged-in counsellor's own stillingsmaler: GET lists them, newest first; POST saves a new one. */
export const { GET, POST } = savedTemplateListRoutes(jobTemplateKind);
