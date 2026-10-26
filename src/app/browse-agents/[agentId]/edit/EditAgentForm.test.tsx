import { render, screen } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { type AdvancedSettings, DEFAULT_ADVANCED_SETTINGS } from '@/domain/advancedSettings';
import { interviewer } from '@/domain/agentTypes/interviewer';
import type { AnswerSources, Answers } from '@/domain/agentTypes/types';
import { builtInLegalTemplates } from '@/data/legal-templates';
import { describeLegalFrameworks } from '@/domain/legalTemplate';
import { EditAgentForm, type AnswerPreset, type LegalPreset } from './EditAgentForm';

const push = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/components/agents/useLanguageModels', () => ({
  useLanguageModels: () => ({
    models: ['openai/gpt-oss-120b', 'meta/llama-3.3-70b'],
    loading: false,
    failed: false,
  }),
}));

const onSave =
  vi.fn<
    (
      name: string,
      answers: Answers,
      sources: AnswerSources,
      settings?: AdvancedSettings,
      avatar?: string | null,
    ) => Promise<string>
  >();

const answers = {
  stilling: 'Barnehagelærer',
  bransje: 'Barnehage (offentlig)',
  bedrift: 'Ingen navn',
  intervjutype: 'første intervju',
  intervjuer: 'leder, vennlig',
  jobbsoker: 'under 25, lite erfaring',
  vanskelighetsgrad: 'lett',
  egneSporsmal: 'ingen',
  tillegg: '',
};

const profilePreset: AnswerPreset = {
  field: 'jobbsoker',
  kind: 'profile',
  label: 'Jobbsøkermal',
  loaded: true,
  options: [
    { id: 'profile-1', label: 'Profil A', value: 'aldersgruppe 30–39 år' },
    // Same text as Profil A: only the stored source can tell them apart.
    { id: 'profile-2', label: 'Profil B', value: 'aldersgruppe 30–39 år' },
  ],
  manageHref: '/profiles',
  manageLabel: 'Administrer maler',
};

const savedLegal = {
  id: 'legal-1',
  title: 'Arbeidsmiljøloven § 9-3',
  description: 'Helseopplysninger',
  text: 'Ikke spør om helse.',
  builtIn: false,
};
const legalPreset: LegalPreset = {
  field: 'lovverk',
  options: [...builtInLegalTemplates, savedLegal],
  loaded: true,
};

type RenderOptions = {
  initialAnswers?: Answers;
  initialSources?: AnswerSources;
  initialSettings?: AdvancedSettings;
  initialAvatar?: string | null;
  allowUnchanged?: boolean;
  presets?: AnswerPreset[];
  legalPreset?: LegalPreset;
};

function renderForm({
  initialAnswers = answers,
  initialSources,
  initialSettings = DEFAULT_ADVANCED_SETTINGS,
  initialAvatar = null,
  allowUnchanged = false,
  presets,
  legalPreset,
}: RenderOptions = {}) {
  render(
    <EditAgentForm
      agentId="agent-1"
      initialName="Intervjuer for Barnehagelærer"
      definition={interviewer}
      initialAnswers={initialAnswers}
      initialSources={initialSources}
      initialSettings={initialSettings}
      initialAvatar={initialAvatar}
      label="Rediger agent"
      submitLabel="Lagre endringer"
      onSave={onSave}
      allowUnchanged={allowUnchanged}
      presets={presets}
      legalPreset={legalPreset}
    />,
  );
}

// MUI adds " *" to the label of a required field, so we match the start of the label.
const field = (label: string) => screen.getByRole('textbox', { name: new RegExp(`^${label}`) });
const saveButton = () => screen.getByRole('button', { name: 'Lagre endringer' });

/**
 * Replaces the text in a field. Pastes instead of typing: typing re-renders the MUI field once
 * per letter, which is slow enough to time out when the whole test suite runs at once.
 */
async function replaceText(user: UserEvent, label: string, text: string) {
  await user.clear(field(label));
  await user.paste(text);
}

describe('EditAgentForm', () => {
  afterEach(() => {
    onSave.mockReset();
    push.mockReset();
  });

  it('shows the name and one field per answer, filled in', () => {
    renderForm();

    expect(field('Navn')).toHaveValue('Intervjuer for Barnehagelærer');
    expect(field('Stilling')).toHaveValue('Barnehagelærer');
    expect(field('Vanskelighetsgrad')).toHaveValue('lett');
  });

  it('saves the changes and goes to the agent the save returns', async () => {
    onSave.mockResolvedValue('agent-2');
    const user = userEvent.setup();
    renderForm();

    await replaceText(user, 'Navn', 'Ny intervjuer');
    await replaceText(user, 'Vanskelighetsgrad', 'vanskelig');
    await user.click(saveButton());

    // Unchanged advanced settings are not sent, so the agent keeps the ones it has.
    expect(onSave).toHaveBeenCalledWith(
      'Ny intervjuer',
      { ...answers, vanskelighetsgrad: 'vanskelig' },
      {},
      undefined,
      undefined,
    );
    expect(push).toHaveBeenCalledWith('/browse-agents/agent-2');
  });

  it('saves a hand-written system prompt with the advanced settings', async () => {
    onSave.mockResolvedValue('agent-1');
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: /Avanserte innstillinger/ }));
    await user.click(screen.getByRole('switch', { name: 'Skriv systemprompten selv' }));
    // The editor starts with the prompt built from the answers.
    expect(field('Systemprompt')).toHaveValue(interviewer.buildPrompt(answers));

    await replaceText(user, 'Systemprompt', 'Du er en streng barnehagestyrer.');
    expect(screen.getByText('1 endring som ikke er lagret')).toBeVisible();
    await user.click(saveButton());

    expect(onSave).toHaveBeenCalledWith(
      'Intervjuer for Barnehagelærer',
      answers,
      {},
      {
        ...DEFAULT_ADVANCED_SETTINGS,
        customPrompt: 'Du er en streng barnehagestyrer.',
      },
      undefined,
    );
  });

  it('says the answers no longer change a hand-written prompt', () => {
    renderForm({ initialSettings: { ...DEFAULT_ADVANCED_SETTINGS, customPrompt: 'Du er Kari.' } });

    expect(
      screen.getByText('Systemprompten er skrevet for hånd, så disse svarene endrer den ikke.'),
    ).toBeVisible();
  });

  it('can still be saved when settings it did not change would not pass its own checks', async () => {
    onSave.mockResolvedValue('agent-1');
    const user = userEvent.setup();
    // Saved by another client with three decimals, which the form would not accept.
    renderForm({ initialSettings: { ...DEFAULT_ADVANCED_SETTINGS, temperature: 0.333 } });

    await replaceText(user, 'Navn', 'Ny intervjuer');
    expect(screen.getByText('1 endring som ikke er lagret')).toBeVisible();
    expect(saveButton()).toBeEnabled();
    await user.click(saveButton());

    expect(onSave).toHaveBeenCalledWith('Ny intervjuer', answers, {}, undefined, undefined);
  });

  it('cannot be saved with an invalid temperature, and says why in Norwegian', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: /Avanserte innstillinger/ }));
    await replaceText(user, 'Verdi', '3');

    expect(saveButton()).toBeDisabled();
    expect(screen.getByText(/Temperaturen må være et tall mellom 0 og 2/)).toBeVisible();
  });

  it('shows the error and keeps what was typed when saving fails', async () => {
    onSave.mockRejectedValue(new Error('Du er logget ut. Logg inn på nytt og prøv igjen.'));
    const user = userEvent.setup();
    renderForm();

    await replaceText(user, 'Vanskelighetsgrad', 'vanskelig');
    await user.click(saveButton());

    expect(await screen.findByRole('alert')).toHaveTextContent('Du er logget ut.');
    expect(field('Vanskelighetsgrad')).toHaveValue('vanskelig');
    expect(push).not.toHaveBeenCalled();
  });

  it('cannot be saved before something is changed, and counts the changes', async () => {
    const user = userEvent.setup();
    renderForm();

    expect(saveButton()).toBeDisabled();
    expect(screen.getByText('Ingen endringer ennå')).toBeVisible();

    await replaceText(user, 'Vanskelighetsgrad', 'vanskelig');

    expect(saveButton()).toBeEnabled();
    expect(screen.getByText('1 endring som ikke er lagret')).toBeVisible();
  });

  it('can be saved without changes when that is allowed, as for a clone', async () => {
    onSave.mockResolvedValue('agent-2');
    const user = userEvent.setup();
    renderForm({ allowUnchanged: true });

    await user.click(saveButton());

    expect(onSave).toHaveBeenCalledWith(
      'Intervjuer for Barnehagelærer',
      answers,
      {},
      undefined,
      undefined,
    );
  });

  describe('avatar', () => {
    const avatarRadio = (name: string) => screen.getByRole('radio', { name });

    it('shows the avatar the agent has, or the default image', () => {
      renderForm({ initialAvatar: 'ugle' });

      expect(avatarRadio('Ugle')).toBeChecked();
    });

    it('shows the default image as chosen for an agent without an avatar', () => {
      renderForm();

      expect(avatarRadio('Standard')).toBeChecked();
    });

    it('saves a new avatar and counts it as a change', async () => {
      onSave.mockResolvedValue('agent-1');
      const user = userEvent.setup();
      renderForm();

      expect(saveButton()).toBeDisabled();
      await user.click(avatarRadio('Rev'));

      expect(screen.getByText('1 endring som ikke er lagret')).toBeVisible();
      await user.click(saveButton());
      expect(onSave).toHaveBeenCalledWith(
        'Intervjuer for Barnehagelærer',
        answers,
        {},
        undefined,
        'rev',
      );
    });

    it('saves null when the default image is chosen instead of an avatar', async () => {
      onSave.mockResolvedValue('agent-1');
      const user = userEvent.setup();
      renderForm({ initialAvatar: 'ugle' });

      await user.click(avatarRadio('Standard'));
      await user.click(saveButton());

      expect(onSave).toHaveBeenCalledWith(
        'Intervjuer for Barnehagelærer',
        answers,
        {},
        undefined,
        null,
      );
    });

    it('does not send the avatar when it is chosen back to what it was', async () => {
      onSave.mockResolvedValue('agent-1');
      const user = userEvent.setup();
      renderForm({ initialAvatar: 'ugle', allowUnchanged: true });

      await user.click(avatarRadio('Rev'));
      await user.click(avatarRadio('Ugle'));
      expect(screen.getByText('Ingen endringer ennå')).toBeVisible();
      await user.click(saveButton());

      expect(onSave).toHaveBeenCalledWith(
        'Intervjuer for Barnehagelærer',
        answers,
        {},
        undefined,
        undefined,
      );
    });
  });

  it('cannot be saved while a field is empty', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.clear(field('Bransje'));

    expect(saveButton()).toBeDisabled();
  });

  it('shows an empty field for an answer the agent type got after saving', () => {
    renderForm({ initialAnswers: { ...answers, bedrift: '' } });

    expect(field('Bedrift')).toHaveValue('');
    expect(saveButton()).toBeDisabled();
  });

  describe('presets', () => {
    const select = () => screen.getByRole('combobox', { name: 'Jobbsøkermal' });
    const profileAnswers = { ...answers, jobbsoker: 'aldersgruppe 30–39 år' };

    async function choose(user: UserEvent, option: string) {
      await user.click(select());
      await user.click(screen.getByRole('option', { name: option }));
    }

    it('fills in the answer, remembers the source, and saves both', async () => {
      onSave.mockResolvedValue('agent-1');
      const user = userEvent.setup();
      renderForm({ presets: [profilePreset] });

      await choose(user, 'Profil B');

      expect(field('Jobbsøker')).toHaveValue('aldersgruppe 30–39 år');
      expect(select()).toHaveTextContent('Profil B');
      expect(screen.getByText('1 endring som ikke er lagret')).toBeVisible();

      await user.click(saveButton());

      expect(onSave).toHaveBeenCalledWith(
        'Intervjuer for Barnehagelærer',
        { ...answers, jobbsoker: 'aldersgruppe 30–39 år' },
        { jobbsoker: { kind: 'profile', id: 'profile-2' } },
        undefined,
        undefined,
      );
    });

    it('shows the stored source, also when another option has the same text', () => {
      renderForm({
        initialAnswers: profileAnswers,
        initialSources: { jobbsoker: { kind: 'profile', id: 'profile-2' } },
        presets: [profilePreset],
      });

      expect(select()).toHaveTextContent('Profil B');
    });

    it('drops the source when the counsellor types in the field', async () => {
      onSave.mockResolvedValue('agent-1');
      const user = userEvent.setup();
      renderForm({
        initialAnswers: profileAnswers,
        initialSources: { jobbsoker: { kind: 'profile', id: 'profile-1' } },
        presets: [profilePreset],
      });

      await user.type(field('Jobbsøker'), ', snakker engelsk');

      expect(select()).toHaveTextContent('Egen tekst');
      await user.click(saveButton());
      expect(onSave.mock.calls[0][2]).toEqual({});
    });

    it('shows "Egen tekst" for an answer without a source, even if the text matches', () => {
      renderForm({ initialAnswers: profileAnswers, presets: [profilePreset] });

      expect(select()).toHaveTextContent('Egen tekst');
    });

    it('says so when the source has been changed since', () => {
      renderForm({
        initialSources: { jobbsoker: { kind: 'profile', id: 'profile-1' } },
        presets: [profilePreset],
      });

      expect(select()).toHaveTextContent('Egen tekst');
      expect(screen.getByText('Teksten kom fra «Profil A», som er endret siden.')).toBeVisible();
    });

    it('does not report a missing source while the options are loading', () => {
      renderForm({
        initialSources: { jobbsoker: { kind: 'profile', id: 'deleted' } },
        presets: [{ ...profilePreset, loaded: false }],
      });

      expect(screen.queryByText(/finnes lenger/)).not.toBeInTheDocument();
    });

    it('says so when the source no longer exists once loaded', () => {
      renderForm({
        initialSources: { jobbsoker: { kind: 'profile', id: 'deleted' } },
        presets: [profilePreset],
      });

      expect(
        screen.getByText('Teksten kom fra en jobbsøkermal som ikke finnes lenger.'),
      ).toBeVisible();
    });

    it('puts the saved answer back as own text when "Egen tekst" is chosen', async () => {
      const user = userEvent.setup();
      renderForm({ presets: [profilePreset] });

      await choose(user, 'Profil A');
      await choose(user, 'Egen tekst');

      expect(field('Jobbsøker')).toHaveValue('under 25, lite erfaring');
      expect(screen.getByText('Ingen endringer ennå')).toBeVisible();
    });

    it('links to where the options are managed', () => {
      renderForm({ presets: [profilePreset] });

      expect(screen.getByRole('link', { name: 'Administrer maler' })).toHaveAttribute(
        'href',
        '/profiles',
      );
    });
  });

  describe('legal templates', () => {
    const box = (name: string) => screen.getByRole('checkbox', { name });
    const builtIn = builtInLegalTemplates[0];
    const lawText = describeLegalFrameworks([builtIn, savedLegal]);
    const lawSource = { kind: 'legal' as const, ids: [builtIn.id, 'legal-1'] };

    it('ticks the templates the text came from', () => {
      renderForm({
        initialAnswers: { ...answers, lovverk: lawText },
        initialSources: { lovverk: lawSource },
        legalPreset,
      });

      expect(box(builtIn.title)).toBeChecked();
      expect(box('Arbeidsmiljøloven § 9-3')).toBeChecked();
    });

    it('fills in Lovverk from the ticked templates, and saves the text with its source', async () => {
      onSave.mockResolvedValue('agent-1');
      const user = userEvent.setup();
      renderForm({ legalPreset });

      await user.click(box(builtIn.title));
      await user.click(box('Arbeidsmiljøloven § 9-3'));

      expect(field('Lovverk')).toHaveValue(lawText);
      await user.click(saveButton());
      expect(onSave.mock.calls[0][1].lovverk).toBe(lawText);
      expect(onSave.mock.calls[0][2]).toEqual({ lovverk: lawSource });
    });

    it('empties Lovverk when every template that made it is unticked', async () => {
      onSave.mockResolvedValue('agent-1');
      const user = userEvent.setup();
      renderForm({
        initialAnswers: { ...answers, lovverk: lawText },
        initialSources: { lovverk: lawSource },
        legalPreset,
      });

      await user.click(box(builtIn.title));
      await user.click(box('Arbeidsmiljøloven § 9-3'));

      expect(field('Lovverk')).toHaveValue('');
      await user.click(saveButton());
      expect(onSave.mock.calls[0][2]).toEqual({});
    });

    it('puts the counsellor’s own text back when the templates are unticked again', async () => {
      const user = userEvent.setup();
      renderForm({ initialAnswers: { ...answers, lovverk: 'Egen regel.' }, legalPreset });

      await user.click(box('Arbeidsmiljøloven § 9-3'));
      expect(field('Lovverk')).toHaveValue('Arbeidsmiljøloven § 9-3:\nIkke spør om helse.');
      await user.click(box('Arbeidsmiljøloven § 9-3'));

      expect(field('Lovverk')).toHaveValue('Egen regel.');
      expect(screen.getByText('Ingen endringer ennå')).toBeVisible();
    });

    it('unticks the templates when the counsellor types in Lovverk', async () => {
      const user = userEvent.setup();
      renderForm({
        initialAnswers: { ...answers, lovverk: lawText },
        initialSources: { lovverk: lawSource },
        legalPreset,
      });

      await user.type(field('Lovverk'), ' Mer.');

      expect(box(builtIn.title)).not.toBeChecked();
    });

    it('says so when a template has been changed or deleted since', () => {
      const props = {
        initialAnswers: { ...answers, lovverk: 'Gammel tekst' },
        initialSources: { lovverk: lawSource },
      };
      renderForm({ ...props, legalPreset });
      expect(box('Arbeidsmiljøloven § 9-3')).not.toBeChecked();
      expect(
        screen.getByText(/Teksten kom fra «.+», «Arbeidsmiljøloven § 9-3», som er endret siden\./),
      ).toBeVisible();
    });

    it('says so when a template no longer exists, but not while loading', () => {
      const props = {
        initialAnswers: { ...answers, lovverk: lawText },
        initialSources: { lovverk: { kind: 'legal' as const, ids: ['deleted'] } },
      };
      renderForm({ ...props, legalPreset: { ...legalPreset, loaded: false } });
      expect(screen.queryByText(/finnes lenger/)).not.toBeInTheDocument();
    });

    it('says so when a template no longer exists once loaded', () => {
      renderForm({
        initialAnswers: { ...answers, lovverk: lawText },
        initialSources: { lovverk: { kind: 'legal', ids: ['deleted'] } },
        legalPreset,
      });

      expect(screen.getByText(/Teksten kom fra lovverk som ikke finnes lenger\./)).toBeVisible();
    });
  });
});
