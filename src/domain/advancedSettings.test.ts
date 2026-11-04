// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  advancedSettingsErrors,
  DEFAULT_ADVANCED_SETTINGS,
  DEFAULT_MODEL,
  DEFAULT_MAX_TOKENS,
  DEFAULT_TEMPERATURE,
  formatTemperature,
  isSlow,
  MAX_PROMPT_LENGTH,
  parseAdvancedSettings,
  settingsOf,
} from './advancedSettings';

const models = [DEFAULT_MODEL, 'meta/llama-3.3-70b'];

describe('advancedSettingsErrors', () => {
  it('accepts the defaults', () => {
    expect(advancedSettingsErrors(DEFAULT_ADVANCED_SETTINGS, models)).toEqual({});
  });

  it('accepts another model from the list and a hand-written prompt', () => {
    const settings = {
      model: 'meta/llama-3.3-70b',
      temperature: 1.25,
      maxTokens: 4000,
      customPrompt: 'Du er …',
    };
    expect(advancedSettingsErrors(settings, models)).toEqual({});
  });

  it('rejects a model that is not in the list', () => {
    const errors = advancedSettingsErrors({ ...DEFAULT_ADVANCED_SETTINGS, model: 'gpt-5' }, models);
    expect(errors.model).toBe('Velg en språkmodell fra listen.');
  });

  // Above 1.5 the model rarely stops on its own and the reply times out (#132).
  it.each([-0.1, 1.51, 2, 0.123, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects the temperature %s',
    (temperature) => {
      const errors = advancedSettingsErrors({ ...DEFAULT_ADVANCED_SETTINGS, temperature }, models);
      expect(errors.temperature).toMatch(/mellom 0 og 1,5/);
    },
  );

  it.each([0, 0.29, 1.5])('accepts the temperature %s', (temperature) => {
    expect(advancedSettingsErrors({ ...DEFAULT_ADVANCED_SETTINGS, temperature }, models)).toEqual(
      {},
    );
  });

  it.each([255, 8001, 1000.5, Number.NaN])('rejects %s max tokens', (maxTokens) => {
    const errors = advancedSettingsErrors({ ...DEFAULT_ADVANCED_SETTINGS, maxTokens }, models);
    expect(errors.maxTokens).toBe('Antall tokens må være et heltall mellom 256 og 8000.');
  });

  it.each([256, 8000])('accepts %s max tokens', (maxTokens) => {
    expect(advancedSettingsErrors({ ...DEFAULT_ADVANCED_SETTINGS, maxTokens }, models)).toEqual({});
  });

  it('rejects an empty or too long hand-written prompt', () => {
    expect(
      advancedSettingsErrors({ ...DEFAULT_ADVANCED_SETTINGS, customPrompt: '   ' }, models)
        .customPrompt,
    ).toBe('Systemprompten kan ikke være tom.');
    expect(
      advancedSettingsErrors(
        { ...DEFAULT_ADVANCED_SETTINGS, customPrompt: 'x'.repeat(MAX_PROMPT_LENGTH + 1) },
        models,
      ).customPrompt,
    ).toMatch(/høyst/);
  });
});

describe('isSlow', () => {
  it('is false for the defaults, and true for a high temperature or many tokens', () => {
    expect(isSlow(DEFAULT_ADVANCED_SETTINGS)).toBe(false);
    expect(isSlow({ temperature: 1, maxTokens: 2000 })).toBe(false);
    expect(isSlow({ temperature: 1.1, maxTokens: DEFAULT_MAX_TOKENS })).toBe(true);
    expect(isSlow({ temperature: DEFAULT_TEMPERATURE, maxTokens: 2001 })).toBe(true);
  });
});

describe('settingsOf', () => {
  it('gives agents saved without a temperature or max tokens the defaults', () => {
    expect(
      settingsOf({ model: '', temperature: null, maxTokens: null, prompt: 'Bygget' }, false),
    ).toEqual(DEFAULT_ADVANCED_SETTINGS);
  });

  it('keeps the values the agent has, and its prompt when written by hand', () => {
    expect(
      settingsOf(
        { model: 'meta/llama-3.3-70b', temperature: 1.2, maxTokens: 3000, prompt: 'Egen' },
        true,
      ),
    ).toEqual({
      model: 'meta/llama-3.3-70b',
      temperature: 1.2,
      maxTokens: 3000,
      customPrompt: 'Egen',
    });
  });
});

describe('formatTemperature', () => {
  it('writes decimals with a comma, and nothing for a value that is not a number', () => {
    expect(formatTemperature(0.7)).toBe('0,7');
    expect(formatTemperature(2)).toBe('2');
    expect(formatTemperature(Number.NaN)).toBe('');
  });
});

describe('parseAdvancedSettings', () => {
  it('returns valid settings as they are', () => {
    const input = { model: DEFAULT_MODEL, temperature: 0.2, maxTokens: 1500, customPrompt: null };
    expect(parseAdvancedSettings(input, models)).toEqual(input);
  });

  it.each([
    null,
    'text',
    { model: DEFAULT_MODEL, temperature: '0.2', maxTokens: 1000, customPrompt: null },
    { model: DEFAULT_MODEL, temperature: 0.2, maxTokens: 1000 },
    { model: DEFAULT_MODEL, temperature: 0.2, customPrompt: null },
    { model: DEFAULT_MODEL, temperature: 0.2, maxTokens: '1000', customPrompt: null },
    { model: 42, temperature: 0.2, maxTokens: 1000, customPrompt: null },
    { model: DEFAULT_MODEL, temperature: 2, maxTokens: 1000, customPrompt: null },
    { model: DEFAULT_MODEL, temperature: 0.2, maxTokens: 100000, customPrompt: null },
    { model: 'unknown', temperature: 0.2, maxTokens: 1000, customPrompt: null },
    { model: DEFAULT_MODEL, temperature: 0.2, maxTokens: 1000, customPrompt: '' },
  ])('returns null for %j', (input) => {
    expect(parseAdvancedSettings(input, models)).toBeNull();
  });
});
