import type { LegalTemplate, NewLegalTemplate } from '@/domain/legalTemplate';

const GENERIC_ERROR = 'Noe gikk galt. Prøv igjen.';

/** The Norwegian message for a failed request. Never the server's own text. */
function errorMessage(status: number): string {
  if (status === 401) return 'Du er logget ut. Logg inn på nytt og prøv igjen.';
  if (status === 400) return 'Lovverket ble ikke godtatt. Sjekk feltene og prøv igjen.';
  if (status === 404) return 'Fant ikke lovverket. Det kan ha blitt slettet.';
  if (status === 504) return 'Det tok for lang tid å få svar. Prøv igjen.';
  return GENERIC_ERROR;
}

/** Calls one of our legal template routes. Throws Error with a Norwegian message if it can't. */
async function send(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (cause) {
    throw new Error('Fikk ikke kontakt med serveren. Sjekk nettverket og prøv igjen.', { cause });
  }
}

function withJson(method: 'POST' | 'PUT', template: NewLegalTemplate): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(template),
  };
}

const templateUrl = (id: string) => `/api/legal-templates/${encodeURIComponent(id)}`;

function isLegalTemplate(value: unknown): value is LegalTemplate {
  if (typeof value !== 'object' || value === null) return false;
  const t = value as Record<string, unknown>;
  return (
    typeof t.id === 'string' &&
    typeof t.title === 'string' &&
    typeof t.description === 'string' &&
    typeof t.text === 'string' &&
    typeof t.builtIn === 'boolean'
  );
}

/**
 * The legal templates the counsellor has saved, newest first. Not the built-in ones.
 * Throws Error with a Norwegian message.
 */
export async function fetchLegalTemplates(signal?: AbortSignal): Promise<LegalTemplate[]> {
  const res = await send('/api/legal-templates', { cache: 'no-store', signal });
  if (!res.ok) throw new Error(errorMessage(res.status));

  const data = await res.json().catch(() => null);
  if (!Array.isArray(data?.templates) || !data.templates.every(isLegalTemplate)) {
    throw new Error(GENERIC_ERROR);
  }
  return data.templates;
}

/**
 * One of the counsellor's legal templates, or null if they have none with this id.
 * Throws Error with a Norwegian message for any other failure.
 */
export async function fetchLegalTemplate(id: string): Promise<LegalTemplate | null> {
  const res = await send(templateUrl(id), { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(errorMessage(res.status));

  const data = await res.json().catch(() => null);
  if (!isLegalTemplate(data?.template)) throw new Error(GENERIC_ERROR);
  return data.template;
}

/** Saves a new legal template and returns its id. Throws Error with a Norwegian message. */
export async function saveLegalTemplate(template: NewLegalTemplate): Promise<string> {
  const res = await send('/api/legal-templates', withJson('POST', template));
  if (!res.ok) throw new Error(errorMessage(res.status));

  const data = await res.json().catch(() => null);
  if (typeof data?.template?.id !== 'string') throw new Error(GENERIC_ERROR);
  return data.template.id;
}

/** Saves changes to one of the counsellor's legal templates. Throws Error with a Norwegian message. */
export async function updateLegalTemplate(id: string, template: NewLegalTemplate): Promise<void> {
  const res = await send(templateUrl(id), withJson('PUT', template));
  if (!res.ok) throw new Error(errorMessage(res.status));
}

/** Deletes one of the counsellor's legal templates. Throws Error with a Norwegian message. */
export async function deleteLegalTemplate(id: string): Promise<void> {
  const res = await send(templateUrl(id), { method: 'DELETE' });
  if (!res.ok) throw new Error(errorMessage(res.status));
}
