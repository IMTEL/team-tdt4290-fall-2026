/**
 * The settings an experienced counsellor can change beyond the configuration: the language model,
 * its temperature, and a system prompt written by hand instead of built from the answers.
 */
export type AdvancedSettings = {
  model: string;
  temperature: number;
  /** A prompt the counsellor wrote. Null means the prompt is built from the answers. */
  customPrompt: string | null;
};

/** The model every agent used before advanced settings existed, named the way RAGdoll knows it. */
export const DEFAULT_MODEL = 'openai/gpt-oss-120b';
/** RAGdoll's own default for an agent's temperature. */
export const DEFAULT_TEMPERATURE = 0.7;
/** RAGdoll accepts temperatures from 0 to 2. */
export const MIN_TEMPERATURE = 0;
export const MAX_TEMPERATURE = 2;
export const MAX_PROMPT_LENGTH = 20000;

export const DEFAULT_ADVANCED_SETTINGS: AdvancedSettings = {
  model: DEFAULT_MODEL,
  temperature: DEFAULT_TEMPERATURE,
  customPrompt: null,
};

/** A Norwegian message for each setting that is not valid. Empty when everything is valid. */
export type AdvancedSettingsErrors = Partial<Record<keyof AdvancedSettings, string>>;

/** Checks the settings against the models RAGdoll offers. Messages are written for counsellors. */
export function advancedSettingsErrors(
  settings: AdvancedSettings,
  allowedModels: readonly string[],
): AdvancedSettingsErrors {
  const errors: AdvancedSettingsErrors = {};

  if (!allowedModels.includes(settings.model)) {
    errors.model = 'Velg en språkmodell fra listen.';
  }
  if (!isValidTemperature(settings.temperature)) {
    errors.temperature = `Temperaturen må være et tall mellom ${MIN_TEMPERATURE} og ${MAX_TEMPERATURE}, med høyst to desimaler.`;
  }
  if (settings.customPrompt !== null) {
    if (settings.customPrompt.trim() === '') {
      errors.customPrompt = 'Systemprompten kan ikke være tom.';
    } else if (settings.customPrompt.length > MAX_PROMPT_LENGTH) {
      errors.customPrompt = `Systemprompten kan ha høyst ${MAX_PROMPT_LENGTH} tegn.`;
    }
  }

  return errors;
}

/**
 * Reads advanced settings sent by the browser. Returns null if they are not well formed or not
 * valid, so the server never saves something the form would have rejected.
 */
export function parseAdvancedSettings(
  input: unknown,
  allowedModels: readonly string[],
): AdvancedSettings | null {
  if (typeof input !== 'object' || input === null) return null;
  const { model, temperature, customPrompt } = input as Record<string, unknown>;

  if (typeof model !== 'string' || typeof temperature !== 'number') return null;
  if (customPrompt !== null && typeof customPrompt !== 'string') return null;

  const settings: AdvancedSettings = { model, temperature, customPrompt };
  return Object.keys(advancedSettingsErrors(settings, allowedModels)).length === 0
    ? settings
    : null;
}

/**
 * The settings a saved agent has now. `customPrompt` says whether its prompt was written by hand;
 * if not, the prompt is the built one and the settings say so with null. Agents saved before
 * advanced settings existed have no temperature of their own and get the default.
 */
export function settingsOf(
  agent: { model: string; temperature: number | null; prompt: string },
  customPrompt: boolean,
): AdvancedSettings {
  return {
    model: agent.model || DEFAULT_MODEL,
    temperature: agent.temperature ?? DEFAULT_TEMPERATURE,
    customPrompt: customPrompt ? agent.prompt : null,
  };
}

/** The temperature as Norwegians write it, with a decimal comma. Empty for a value that is not a number. */
export function formatTemperature(temperature: number): string {
  return Number.isFinite(temperature) ? String(temperature).replace('.', ',') : '';
}

function isValidTemperature(value: number): boolean {
  return (
    Number.isFinite(value) &&
    value >= MIN_TEMPERATURE &&
    value <= MAX_TEMPERATURE &&
    // 0.29 * 100 is not exactly 29, so compare with the value rounded to two decimals.
    Number(value.toFixed(2)) === value
  );
}
