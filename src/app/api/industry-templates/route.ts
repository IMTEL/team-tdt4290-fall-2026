import { savedTemplateListRoutes } from '@/server/savedTemplateRoutes';
import { industryTemplateKind } from '@/server/workplaceTemplateMapper';

/** The logged-in counsellor's own bransjemaler: GET lists them, newest first; POST saves a new one. */
export const { GET, POST } = savedTemplateListRoutes(industryTemplateKind);
