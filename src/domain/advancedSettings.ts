/**
 * The settings an experienced counsellor can change beyond the configuration: the language model,
 * its temperature, the most tokens it may write in one reply, and a system prompt written by hand
 * instead of built from the answers.
 */
export type AdvancedSettings = {
  model: string;
  temperature: number;
  /** The most tokens the model may write in one reply, reasoning included. */
  maxTokens: number;
  /** A prompt the counsellor wrote. Null means the prompt is built from the answers. */
  customPrompt: string | null;
};

/** The model every agent used before advanced settings existed, named the way RAGdoll knows it. */
export const DEFAULT_MODEL = 'openai/gpt-oss-120b';
/** RAGdoll's own default for an agent's temperature. */
export const DEFAULT_TEMPERATURE = 0.7;
export const MIN_TEMPERATURE = 0;
/**
 * RAGdoll accepts temperatures up to 2, but from about 1.5 the model rarely stops on its own: it
 * writes until it runs out of tokens and the reply times out (#132).
 */
export const MAX_TEMPERATURE = 1.5;
/** RAGdoll's own default for the most tokens in a reply. */
export const DEFAULT_MAX_TOKENS = 1000;
/**
 * The model reasons before it answers, and the reasoning counts towards the tokens. With only a few
 * hundred, the reply comes back empty.
 */
export const MIN_MAX_TOKENS = 256;
export const MAX_MAX_TOKENS = 8000;
/** Above these values, the form warns that replies can get much slower. */
export const SLOW_TEMPERATURE = 1;
export const SLOW_MAX_TOKENS = 2000;
export const MAX_PROMPT_LENGTH = 20000;

export const DEFAULT_ADVANCED_SETTINGS: AdvancedSettings = {
  model: DEFAULT_MODEL,
  temperature: DEFAULT_TEMPERATURE,
  maxTokens: DEFAULT_MAX_TOKENS,
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
    // English translation: The temperature must be a number between <min> and <max>, with at most
    // two decimals.
    errors.temperature = `Temperaturen må være et tall mellom ${formatTemperature(MIN_TEMPERATURE)} og ${formatTemperature(MAX_TEMPERATURE)}, med høyst to desimaler.`;
  }
  if (!isValidMaxTokens(settings.maxTokens)) {
    // English translation: The number of tokens must be a whole number between <min> and <max>.
    errors.maxTokens = `Antall tokens må være et heltall mellom ${MIN_MAX_TOKENS} og ${MAX_MAX_TOKENS}.`;
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
  const { model, temperature, maxTokens, customPrompt } = input as Record<string, unknown>;

  if (typeof model !== 'string' || typeof temperature !== 'number') return null;
  if (typeof maxTokens !== 'number') return null;
  if (customPrompt !== null && typeof customPrompt !== 'string') return null;

  const settings: AdvancedSettings = { model, temperature, maxTokens, customPrompt };
  return Object.keys(advancedSettingsErrors(settings, allowedModels)).length === 0
    ? settings
    : null;
}

/**
 * The settings a saved agent has now. `customPrompt` says whether its prompt was written by hand;
 * if not, the prompt is the built one and the settings say so with null. Agents saved before
 * advanced settings existed have no temperature or max tokens of their own and get the defaults.
 */
export function settingsOf(
  agent: { model: string; temperature: number | null; maxTokens: number | null; prompt: string },
  customPrompt: boolean,
): AdvancedSettings {
  return {
    model: agent.model || DEFAULT_MODEL,
    temperature: agent.temperature ?? DEFAULT_TEMPERATURE,
    maxTokens: agent.maxTokens ?? DEFAULT_MAX_TOKENS,
    customPrompt: customPrompt ? agent.prompt : null,
  };
}

/** The temperature as Norwegians write it, with a decimal comma. Empty for a value that is not a number. */
export function formatTemperature(temperature: number): string {
  return Number.isFinite(temperature) ? String(temperature).replace('.', ',') : '';
}

/** True when the settings can make replies much slower, so the form should warn about it. */
export function isSlow(settings: Pick<AdvancedSettings, 'temperature' | 'maxTokens'>): boolean {
  return settings.temperature > SLOW_TEMPERATURE || settings.maxTokens > SLOW_MAX_TOKENS;
}

function isValidMaxTokens(value: number): boolean {
  return Number.isInteger(value) && value >= MIN_MAX_TOKENS && value <= MAX_MAX_TOKENS;
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
