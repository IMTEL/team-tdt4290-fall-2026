import type { InterviewerTemplate } from '@/data/interviewer-templates';

export type NewTemplate = Omit<InterviewerTemplate, 'id'>;

const GENERIC_ERROR = 'Noe gikk galt. Prøv igjen.';

/** The Norwegian message for a failed request. Never the server's own text. */
function errorMessage(status: number): string {
  if (status === 401) return 'Du er logget ut. Logg inn på nytt og prøv igjen.';
  if (status === 400) return 'Malen ble ikke godtatt. Sjekk at alle feltene er fylt ut.';
  if (status === 404) return 'Fant ikke malen. Den kan ha blitt slettet.';
  if (status === 504) return 'Det tok for lang tid å få svar. Prøv igjen.';
  return GENERIC_ERROR;
}

/** Calls one of our template routes. Throws Error with a Norwegian message if it can't. */
async function send(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (cause) {
    throw new Error('Fikk ikke kontakt med serveren. Sjekk nettverket og prøv igjen.', { cause });
  }
}

function withJson(method: 'POST' | 'PUT', template: NewTemplate): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(template),
  };
}

const templateUrl = (id: string) => `/api/templates/${encodeURIComponent(id)}`;

/**
 * Saves a new template owned by the logged-in counsellor and returns its id.
 * Throws Error with a Norwegian message that can be shown as it is.
 */
export async function saveTemplate(template: NewTemplate): Promise<string> {
  const res = await send('/api/templates', withJson('POST', template));
  if (!res.ok) throw new Error(errorMessage(res.status));

  const data = await res.json().catch(() => null);
  if (typeof data?.template?.id !== 'string') throw new Error(GENERIC_ERROR);
  return data.template.id;
}

/**
 * One of the counsellor's saved templates, or null if they have none with this id.
 * Throws Error with a Norwegian message for any other failure.
 */
export async function fetchTemplate(id: string): Promise<InterviewerTemplate | null> {
  const res = await send(templateUrl(id), { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(errorMessage(res.status));

  const data = await res.json().catch(() => null);
  if (typeof data?.template?.id !== 'string') throw new Error(GENERIC_ERROR);
  return data.template;
}

/** Saves changes to one of the counsellor's templates. Throws Error with a Norwegian message. */
export async function updateTemplate(id: string, template: NewTemplate): Promise<void> {
  const res = await send(templateUrl(id), withJson('PUT', template));
  if (!res.ok) throw new Error(errorMessage(res.status));
}

/** Deletes one of the counsellor's templates. Throws Error with a Norwegian message. */
export async function deleteTemplate(id: string): Promise<void> {
  const res = await send(templateUrl(id), { method: 'DELETE' });
  if (!res.ok) throw new Error(errorMessage(res.status));
}
