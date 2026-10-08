import type { InterviewerTemplate } from '@/data/interviewer-templates';

export type NewTemplate = Omit<InterviewerTemplate, 'id'>;

/** The Norwegian message for a failed save. Never the server's own text. */
function saveErrorMessage(status: number): string {
  if (status === 401) return 'Du er logget ut. Logg inn på nytt og prøv igjen.';
  if (status === 400) return 'Malen ble ikke godtatt. Sjekk at alle feltene er fylt ut.';
  if (status === 504) return 'Det tok for lang tid å få svar. Prøv igjen.';
  return 'Noe gikk galt. Prøv igjen.';
}

/**
 * Saves a new template owned by the logged-in counsellor and returns its id.
 * Throws Error with a Norwegian message that can be shown as it is.
 */
export async function saveTemplate(template: NewTemplate): Promise<string> {
  let res: Response;
  try {
    res = await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(template),
    });
  } catch (cause) {
    throw new Error('Fikk ikke kontakt med serveren. Sjekk nettverket og prøv igjen.', { cause });
  }
  if (!res.ok) throw new Error(saveErrorMessage(res.status));

  const data = await res.json().catch(() => null);
  if (typeof data?.template?.id !== 'string') throw new Error('Noe gikk galt. Prøv igjen.');
  return data.template.id;
}
