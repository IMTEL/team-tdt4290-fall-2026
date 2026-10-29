import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { IndustryTemplateForm } from './IndustryTemplateForm';
import { JobTemplateForm } from './JobTemplateForm';

describe('JobTemplateForm', () => {
  it('saves the stillingsmal with its tasks split at the commas', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<JobTemplateForm industries={['Varehandel']} onSave={onSave} cancelHref="/templates" />);

    const save = screen.getByRole('button', { name: 'Lagre stillingsmal' });
    expect(save).toBeDisabled();

    await user.type(screen.getByRole('textbox', { name: 'Stilling' }), 'Lagermedarbeider natt');
    await user.type(screen.getByRole('combobox', { name: 'Bransje' }), 'Logistikk');
    await user.click(screen.getByRole('button', { name: 'Privat' }));
    await user.type(screen.getByRole('textbox', { name: 'Kort beskrivelse' }), 'Plukk om natten.');
    await user.type(
      screen.getByRole('textbox', { name: 'Typiske oppgaver (valgfritt)' }),
      'Plukking, , Truck',
    );
    await user.type(
      screen.getByRole('textbox', { name: 'Dette får intervjueren vite om stillingen' }),
      'Jobber på et lager.',
    );
    await user.click(save);

    expect(onSave).toHaveBeenCalledWith({
      title: 'Lagermedarbeider natt',
      industry: 'Logistikk',
      sector: 'privat',
      description: 'Plukk om natten.',
      tasks: ['Plukking', 'Truck'],
      jobDescription: 'Jobber på et lager.',
    });
  });

  it('shows the error when saving fails, and lets the counsellor try again', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('Stillingsmalen ble ikke godtatt.'));
    const user = userEvent.setup();
    render(
      <JobTemplateForm
        initial={{
          title: 'Kokk',
          industry: 'Servering',
          sector: 'privat',
          description: 'Lager mat.',
          tasks: [],
          jobDescription: 'Lager mat på en restaurant.',
        }}
        industries={['Servering']}
        onSave={onSave}
        cancelHref="/templates"
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Lagre endringene' }));

    expect(await screen.findByText('Stillingsmalen ble ikke godtatt.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Lagre endringene' })).toBeEnabled();
  });
});

describe('IndustryTemplateForm', () => {
  it('does not save a name another industry already has', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <IndustryTemplateForm takenNames={['Varehandel']} onSave={onSave} cancelHref="/templates" />,
    );

    await user.type(screen.getByRole('textbox', { name: 'Bransje' }), 'varehandel');
    await user.type(screen.getByRole('textbox', { name: 'Kort beskrivelse' }), 'Butikker.');

    expect(screen.getByText('Det finnes allerede en bransje med dette navnet.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Lagre bransjemal' })).toBeDisabled();

    await user.clear(screen.getByRole('textbox', { name: 'Bransje' }));
    await user.type(screen.getByRole('textbox', { name: 'Bransje' }), 'Logistikk');
    await user.click(screen.getByRole('button', { name: 'Lagre bransjemal' }));

    expect(onSave).toHaveBeenCalledWith({ name: 'Logistikk', description: 'Butikker.' });
  });
});
