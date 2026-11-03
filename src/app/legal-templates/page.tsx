import { redirect } from 'next/navigation';

import { templatesSectionHref } from '@/app/templates/sectionOpen';

/** The old lovverk list. Maler has that group, so this just opens it. */
export default function LegalTemplatesPage() {
  redirect(templatesSectionHref('lovverk'));
}
