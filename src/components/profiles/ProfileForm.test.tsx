import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { NewJobSeekerProfile } from '@/domain/jobSeekerProfile';
import { ProfileForm, splitList } from './ProfileForm';

const saved: NewJobSeekerProfile = {
  label: 'Profil A',
  ageRange: '18-24',
  experienceLevel: 'little',
  workExperience: 'sommerjobb',
  education: 'videregående',
  languages: ['Norsk B1', 'Arabisk'],
  practiceAreas: ['Mestre nervøsitet', 'Snakke om lønn'],
  notes: 'notat',
};

function setup(initial?: NewJobSeekerProfile) {
  const user = userEvent.setup();
  const onSave = vi.fn<(profile: NewJobSeekerProfile) => Promise<void>>().mockResolvedValue();
  render(<ProfileForm initial={initial} onSave={onSave} />);
  const field = (name: RegExp) => screen.getByRole('textbox', { name });

  async function choose(select: string, option: RegExp) {
    await user.click(screen.getByRole('combobox', { name: select }));
    await user.click(await screen.findByRole('option', { name: option }));
  }

  return { user, onSave, field, choose };
}

describe('ProfileForm for a new profile', () => {
  const saveButton = () => screen.getByRole('button', { name: 'Lagre mal' });

  it('saves every field, with presets and own practice areas together', async () => {
    const { user, onSave, field, choose } = setup();

    await user.type(field(/Navn på malen/), ' Profil A ');
    await choose('Aldersgruppe', /18–24/);
    await choose('Arbeidserfaring', /Litt/);
    await user.type(field(/Hva slags erfaring/), 'sommerjobb');
    await user.type(field(/Utdanning/), 'videregående');
    await user.type(field(/Språk/), 'Norsk B1, , Arabisk');
    await user.click(screen.getByRole('checkbox', { name: 'Mestre nervøsitet' }));
    await user.type(field(/Annet/), 'Snakke om lønn');
    await user.type(field(/Notater/), 'notat');
    await user.click(saveButton());

    expect(onSave).toHaveBeenCalledWith(saved);
    expect(await screen.findByText(/Malen «Profil A» er lagret/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Se malene dine' })).toHaveAttribute(
      'href',
      '/templates',
    );
  });

  it('calls onSaved instead of showing the success alert', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onSaved = vi.fn();
    render(<ProfileForm onSave={onSave} onSaved={onSaved} />);

    await user.type(screen.getByRole('textbox', { name: /Navn på malen/ }), 'Profil A');
    await user.click(screen.getByRole('button', { name: 'Lagre mal' }));

    expect(onSave).toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalled();
    expect(screen.queryByText(/er lagret/)).not.toBeInTheDocument();
  });

  it('needs only a name, and saves the rest as not given', async () => {
    const { user, onSave, field } = setup();

    expect(saveButton()).toBeDisabled();
    await user.type(field(/Navn på malen/), 'Profil B');
    await user.click(saveButton());

    expect(onSave).toHaveBeenCalledWith({
      label: 'Profil B',
      ageRange: null,
      experienceLevel: null,
      workExperience: '',
      education: '',
      languages: [],
      practiceAreas: [],
      notes: '',
    });
  });

  it('warns not to use the job seeker’s real name, and that notes stay private', () => {
    setup();

    expect(screen.getByText(/Ikke bruk jobbsøkerens ekte navn/)).toBeInTheDocument();
    expect(
      screen.getByText(/Notatene sendes ikke til assistenten eller intervjueren/),
    ).toBeInTheDocument();
  });

  it('puts each section in a boxed group with the title on the frame', () => {
    setup();

    const name = screen.getByRole('textbox', { name: /Navn på malen/ });
    const notes = screen.getByRole('textbox', { name: /Notater/ });
    const nameBox = screen.getByRole('group', { name: 'Navn på malen' });
    const notesBox = screen.getByRole('group', { name: 'Notater' });
    const about = screen.getByRole('group', { name: 'Om jobbsøkeren' });
    const practice = screen.getByRole('group', { name: 'Dette vil jobbsøkeren øve på' });
    expect(nameBox).toContainElement(name);
    expect(notesBox).toContainElement(notes);
    expect(
      nameBox.compareDocumentPosition(notesBox) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(notesBox.compareDocumentPosition(about) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(about.compareDocumentPosition(practice) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('shows the error and keeps what was typed when saving fails', async () => {
    const { user, onSave, field } = setup();
    onSave.mockRejectedValue(new Error('Du er logget ut. Logg inn på nytt og prøv igjen.'));

    await user.type(field(/Navn på malen/), 'Profil A');
    await user.click(saveButton());

    expect(await screen.findByRole('alert')).toHaveTextContent('Du er logget ut');
    expect(field(/Navn på malen/)).toHaveValue('Profil A');
  });

  it('has a cancel link back to the templates', () => {
    setup();

    expect(screen.getByRole('link', { name: 'Avbryt' })).toHaveAttribute('href', '/templates');
  });
});

describe('ProfileForm for a saved profile', () => {
  it('starts with the saved values, own practice areas in Annet, and saves the changes', async () => {
    const { user, onSave, field } = setup(saved);

    expect(field(/Navn på malen/)).toHaveValue('Profil A');
    expect(field(/Språk/)).toHaveValue('Norsk B1, Arabisk');
    expect(screen.getByRole('checkbox', { name: 'Mestre nervøsitet' })).toBeChecked();
    expect(field(/Annet/)).toHaveValue('Snakke om lønn');

    await user.click(screen.getByRole('checkbox', { name: 'Mestre nervøsitet' }));
    await user.click(screen.getByRole('button', { name: 'Lagre endringene' }));

    expect(onSave).toHaveBeenCalledWith({ ...saved, practiceAreas: ['Snakke om lønn'] });
  });
});

describe('splitList', () => {
  it('splits on commas and drops empty items', () => {
    expect(splitList(' Norsk B1 ,, Arabisk ,')).toEqual(['Norsk B1', 'Arabisk']);
  });
});
