import { savedTemplateRoutes } from '@/server/savedTemplateRoutes';
import { industryTemplateKind } from '@/server/workplaceTemplateMapper';

/** One of the logged-in counsellor's own bransjemaler: read, replace or delete it. */
export const { GET, PUT, DELETE } = savedTemplateRoutes(industryTemplateKind);
