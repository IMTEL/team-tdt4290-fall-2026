import { DEFAULT_MODEL } from '@/domain/advancedSettings';
import { listLanguageModels } from './ragdoll';

/**
 * The models RAGdoll offers through IDUN, or null if they could not be listed. Never throws:
 * RAGdoll answers 401 both for an expired session and when IDUN rejects the project's key, so a
 * failure here says nothing about the counsellor's login.
 */
export async function offeredModels(sessionToken: string): Promise<string[] | null> {
  const idunKey = process.env.IDUN_API_KEY;
  if (!idunKey) {
    console.error('IDUN_API_KEY is not set: the language models cannot be listed');
    return null;
  }

  try {
    return await listLanguageModels(sessionToken, idunKey);
  } catch (error) {
    console.error('Could not list the language models:', error);
    return null;
  }
}

/**
 * The language models a counsellor may choose in the form: the ones RAGdoll offers, plus the
 * default. If RAGdoll cannot list them, the default can still be chosen.
 */
export async function allowedModels(sessionToken: string): Promise<string[]> {
  return unique([DEFAULT_MODEL, ...((await offeredModels(sessionToken)) ?? [])]);
}

/**
 * The models to check the browser's advanced settings against. The default and `alwaysAllowed`
 * (an agent's current model) are always valid, so RAGdoll is only asked when another model was
 * chosen. Returns null if that model cannot be checked because the list could not be loaded.
 */
export async function modelsToValidate(
  sessionToken: string,
  advanced: unknown,
  alwaysAllowed: string[] = [],
): Promise<string[] | null> {
  const known = unique([DEFAULT_MODEL, ...alwaysAllowed]);
  const requested = (advanced as { model?: unknown } | null)?.model;
  if (typeof requested !== 'string' || known.includes(requested)) return known;

  const offered = await offeredModels(sessionToken);
  return offered === null ? null : unique([...known, ...offered]);
}

function unique(models: string[]): string[] {
  return [...new Set(models)];
}
