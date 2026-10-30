import type { IndustryTemplate } from '@/data/industry-templates';
import type {
  IndustryTemplateEntry,
  NewIndustryTemplate,
  NewJobTemplate,
} from '@/domain/workplaceTemplate';

const GENERIC_ERROR = 'Noe gikk galt. Prøv igjen.';

/** One kind of saved template: where its routes are, and how to name it in an error. */
type Kind<Saved> = {
  url: string;
  /** «Stillingsmalen» or «Bransjemalen», as it starts a sentence. */
  noun: string;
  isSaved: (value: unknown) => value is Saved;
};

/** The Norwegian message for a failed request. Never the server's own text. */
function errorMessage(status: number, noun: string): string {
  if (status === 401) return 'Du er logget ut. Logg inn på nytt og prøv igjen.';
  if (status === 400) return `${noun} ble ikke godtatt. Sjekk feltene og prøv igjen.`;
  if (status === 404) return `Fant ikke ${noun.toLowerCase()}. Den kan ha blitt slettet.`;
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

function withJson(method: 'POST' | 'PUT', body: unknown): RequestInit {
  return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

const itemUrl = (kind: Kind<unknown>, id: string) => `${kind.url}/${encodeURIComponent(id)}`;

async function list<Saved>(kind: Kind<Saved>, signal?: AbortSignal): Promise<Saved[]> {
  const res = await send(kind.url, { cache: 'no-store', signal });
  if (!res.ok) throw new Error(errorMessage(res.status, kind.noun));

  const data = await res.json().catch(() => null);
  if (!Array.isArray(data?.templates) || !data.templates.every(kind.isSaved)) {
    throw new Error(GENERIC_ERROR);
  }
  return data.templates;
}

async function get<Saved>(kind: Kind<Saved>, id: string): Promise<Saved | null> {
  const res = await send(itemUrl(kind, id), { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(errorMessage(res.status, kind.noun));

  const data = await res.json().catch(() => null);
  if (!kind.isSaved(data?.template)) throw new Error(GENERIC_ERROR);
  return data.template;
}

async function create<Saved>(kind: Kind<Saved>, template: unknown): Promise<string> {
  const res = await send(kind.url, withJson('POST', template));
  if (!res.ok) throw new Error(errorMessage(res.status, kind.noun));

  const data = await res.json().catch(() => null);
  if (typeof data?.template?.id !== 'string') throw new Error(GENERIC_ERROR);
  return data.template.id;
}

async function update<Saved>(kind: Kind<Saved>, id: string, template: unknown): Promise<void> {
  const res = await send(itemUrl(kind, id), withJson('PUT', template));
  if (!res.ok) throw new Error(errorMessage(res.status, kind.noun));
}

async function remove<Saved>(kind: Kind<Saved>, id: string): Promise<void> {
  const res = await send(itemUrl(kind, id), { method: 'DELETE' });
  if (!res.ok) throw new Error(errorMessage(res.status, kind.noun));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

const JOBS: Kind<IndustryTemplate> = {
  url: '/api/job-templates',
  noun: 'Stillingsmalen',
  isSaved: (value): value is IndustryTemplate =>
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.industry === 'string' &&
    (value.sector === 'offentlig' || value.sector === 'privat') &&
    typeof value.description === 'string' &&
    Array.isArray(value.tasks) &&
    value.tasks.every((task) => typeof task === 'string') &&
    typeof value.jobDescription === 'string',
};

const INDUSTRIES: Kind<IndustryTemplateEntry> = {
  url: '/api/industry-templates',
  noun: 'Bransjemalen',
  isSaved: (value): value is IndustryTemplateEntry =>
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.description === 'string',
};

/** The stillingsmaler the counsellor has saved, newest first. Not the built-in ones. */
export const fetchJobTemplates = (signal?: AbortSignal) => list(JOBS, signal);
/** One of the counsellor's stillingsmaler, or null if they have none with this id. */
export const fetchJobTemplate = (id: string) => get(JOBS, id);
/** Saves a new stillingsmal and returns its id. */
export const saveJobTemplate = (template: NewJobTemplate) => create(JOBS, template);
export const updateJobTemplate = (id: string, template: NewJobTemplate) =>
  update(JOBS, id, template);
export const deleteJobTemplate = (id: string) => remove(JOBS, id);

/** The bransjemaler the counsellor has saved, newest first. */
export const fetchIndustryTemplates = (signal?: AbortSignal) => list(INDUSTRIES, signal);
/** One of the counsellor's bransjemaler, or null if they have none with this id. */
export const fetchIndustryTemplate = (id: string) => get(INDUSTRIES, id);
/** Saves a new bransjemal and returns its id. */
export const saveIndustryTemplate = (template: NewIndustryTemplate) => create(INDUSTRIES, template);
export const updateIndustryTemplate = (id: string, template: NewIndustryTemplate) =>
  update(INDUSTRIES, id, template);
export const deleteIndustryTemplate = (id: string) => remove(INDUSTRIES, id);
