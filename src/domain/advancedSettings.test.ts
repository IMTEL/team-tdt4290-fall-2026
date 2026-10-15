// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  advancedSettingsErrors,
  DEFAULT_ADVANCED_SETTINGS,
  DEFAULT_MODEL,
  formatTemperature,
  MAX_PROMPT_LENGTH,
  parseAdvancedSettings,
} from './advancedSettings';

const models = [DEFAULT_MODEL, 'meta/llama-3.3-70b'];

describe('advancedSettingsErrors', () => {
  it('accepts the defaults', () => {
    expect(advancedSettingsErrors(DEFAULT_ADVANCED_SETTINGS, models)).toEqual({});
  });

  it('accepts another model from the list and a hand-written prompt', () => {
    const settings = { model: 'meta/llama-3.3-70b', temperature: 1.25, customPrompt: 'Du er …' };
    expect(advancedSettingsErrors(settings, models)).toEqual({});
  });

  it('rejects a model that is not in the list', () => {
    const errors = advancedSettingsErrors({ ...DEFAULT_ADVANCED_SETTINGS, model: 'gpt-5' }, models);
    expect(errors.model).toBe('Velg en språkmodell fra listen.');
  });

  it.each([-0.1, 2.1, 0.123, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects the temperature %s',
    (temperature) => {
      const errors = advancedSettingsErrors({ ...DEFAULT_ADVANCED_SETTINGS, temperature }, models);
      expect(errors.temperature).toMatch(/mellom 0 og 2/);
    },
  );

  it.each([0, 0.29, 2])('accepts the temperature %s', (temperature) => {
    expect(advancedSettingsErrors({ ...DEFAULT_ADVANCED_SETTINGS, temperature }, models)).toEqual(
      {},
    );
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

describe('formatTemperature', () => {
  it('writes decimals with a comma, and nothing for a value that is not a number', () => {
    expect(formatTemperature(0.7)).toBe('0,7');
    expect(formatTemperature(2)).toBe('2');
    expect(formatTemperature(Number.NaN)).toBe('');
  });
});

describe('parseAdvancedSettings', () => {
  it('returns valid settings as they are', () => {
    const input = { model: DEFAULT_MODEL, temperature: 0.2, customPrompt: null };
    expect(parseAdvancedSettings(input, models)).toEqual(input);
  });

  it.each([
    null,
    'text',
    { model: DEFAULT_MODEL, temperature: '0.2', customPrompt: null },
    { model: DEFAULT_MODEL, temperature: 0.2 },
    { model: 42, temperature: 0.2, customPrompt: null },
    { model: DEFAULT_MODEL, temperature: 3, customPrompt: null },
    { model: 'unknown', temperature: 0.2, customPrompt: null },
    { model: DEFAULT_MODEL, temperature: 0.2, customPrompt: '' },
  ])('returns null for %j', (input) => {
    expect(parseAdvancedSettings(input, models)).toBeNull();
  });
});
