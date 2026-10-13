import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import {
  type AdvancedSettings,
  advancedSettingsErrors,
  DEFAULT_ADVANCED_SETTINGS,
} from '@/domain/advancedSettings';
import { AdvancedSettingsFields } from './AdvancedSettingsFields';
import type { LanguageModels } from './useLanguageModels';

const languageModels: LanguageModels = {
  models: ['openai/gpt-oss-120b', 'meta/llama-3.3-70b'],
  loading: false,
  failed: false,
};

/** The fields as a form uses them: it keeps the value and works out the errors. */
function Harness({
  initial = DEFAULT_ADVANCED_SETTINGS,
  models = languageModels,
  onChange = () => {},
}: {
  initial?: AdvancedSettings;
  models?: LanguageModels;
  onChange?: (settings: AdvancedSettings) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <AdvancedSettingsFields
      value={value}
      onChange={(settings) => {
        setValue(settings);
        onChange(settings);
      }}
      builtPrompt="Du er en intervjuer bygget fra svarene."
      languageModels={models}
      errors={advancedSettingsErrors(value, models.models)}
    />
  );
}

const open = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole('button', { name: /Avanserte innstillinger/ }));

describe('AdvancedSettingsFields', () => {
  it('is closed by default and sums up the settings in one line', () => {
    render(<Harness />);

    expect(
      screen.getByText('openai/gpt-oss-120b · temperatur 0,7 · prompt fra svarene'),
    ).toBeVisible();
    // Role queries skip hidden elements: the fields are not reachable while the section is closed.
    expect(screen.queryByRole('combobox', { name: 'Språkmodell' })).not.toBeInTheDocument();
  });

  it('shows the prompt built from the answers until the counsellor writes one', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await open(user);

    expect(screen.getByText('Du er en intervjuer bygget fra svarene.')).toBeVisible();

    await user.click(screen.getByRole('switch', { name: 'Skriv systemprompten selv' }));

    expect(screen.getByRole('textbox', { name: 'Systemprompt' })).toHaveValue(
      'Du er en intervjuer bygget fra svarene.',
    );
    expect(screen.getByText(/egen systemprompt/)).toBeInTheDocument();
  });

  it('keeps a hand-written prompt when the switch is turned off and on again', async () => {
    const user = userEvent.setup();
    render(<Harness initial={{ ...DEFAULT_ADVANCED_SETTINGS, customPrompt: 'Du er Kari.' }} />);
    await open(user);
    const toggle = screen.getByRole('switch', { name: 'Skriv systemprompten selv' });

    await user.click(toggle);
    expect(screen.getByText('Du er en intervjuer bygget fra svarene.')).toBeVisible();
    await user.click(toggle);

    expect(screen.getByRole('textbox', { name: 'Systemprompt' })).toHaveValue('Du er Kari.');
  });

  it('accepts a temperature written with a decimal comma', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness onChange={onChange} />);
    await open(user);

    await user.clear(screen.getByRole('textbox', { name: 'Verdi' }));
    await user.paste('0,5');

    expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_ADVANCED_SETTINGS, temperature: 0.5 });
    expect(screen.queryByText(/Temperaturen må være/)).not.toBeInTheDocument();
  });

  it('says in the heading when something must be fixed', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await open(user);

    await user.clear(screen.getByRole('textbox', { name: 'Verdi' }));

    expect(screen.getByText('Noe i innstillingene må rettes')).toBeVisible();
    expect(screen.getByText(/Temperaturen må være et tall mellom 0 og 2/)).toBeVisible();
  });

  it('goes back to the defaults', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Harness
        initial={{ model: 'meta/llama-3.3-70b', temperature: 1.5, customPrompt: 'Du er Kari.' }}
        onChange={onChange}
      />,
    );
    await open(user);

    await user.click(screen.getByRole('button', { name: 'Tilbakestill til standard' }));

    expect(onChange).toHaveBeenLastCalledWith(DEFAULT_ADVANCED_SETTINGS);
    expect(screen.getByRole('textbox', { name: 'Verdi' })).toHaveValue('0,7');
  });

  it('says when the list of models could not be loaded', async () => {
    const user = userEvent.setup();
    render(<Harness models={{ ...languageModels, failed: true }} />);
    await open(user);

    expect(screen.getByText(/Fikk ikke hentet listen over modeller/)).toBeVisible();
  });
});
