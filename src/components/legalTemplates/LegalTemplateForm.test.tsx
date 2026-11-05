import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { builtInLegalParagraphs } from '@/data/legal-templates';
import { composeLegalTemplateText } from '@/domain/legalTemplate';
import { LegalTemplateForm } from './LegalTemplateForm';

describe('LegalTemplateForm', () => {
  it('starts with every paragraph ticked, and saves without the ones that were discarded', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<LegalTemplateForm onSave={onSave} />);

    const norway = screen.getByRole('group', { name: 'Norge' });
    const eu = screen.getByRole('group', { name: 'EU' });
    const first = builtInLegalParagraphs[0]!;
    expect(within(norway).getByRole('checkbox', { name: first.title })).toBeChecked();
    expect(within(eu).getByRole('checkbox', { name: 'EU lov 1' })).toBeDisabled();
    expect(within(eu).getByRole('checkbox', { name: 'EU lov 1' })).not.toBeChecked();
    expect(within(eu).getAllByText('Kommer senere')).toHaveLength(3);

    const source = within(norway).getAllByRole('link', { name: 'Kilde' })[0];
    expect(source).toHaveAttribute('href', first.sourceUrl);
    expect(source).toHaveAttribute('target', '_blank');

    await user.click(within(norway).getAllByRole('button', { name: 'Vis lovtekst' })[0]);
    expect(screen.getByText(first.text)).toBeVisible();

    await user.click(screen.getByRole('checkbox', { name: first.title }));
    await user.type(screen.getByRole('textbox', { name: /Navn/ }), 'Uten likestillingsloven');
    await user.type(screen.getByRole('textbox', { name: /Kort beskrivelse/ }), 'Vraker § 30.');
    await user.click(screen.getByRole('button', { name: 'Lagre lovverk' }));

    const kept = builtInLegalParagraphs.filter((paragraph) => paragraph.id !== first.id);
    expect(onSave).toHaveBeenCalledWith({
      title: 'Uten likestillingsloven',
      description: 'Vraker § 30.',
      text: composeLegalTemplateText(kept, ''),
      sourceIds: kept.map((paragraph) => paragraph.id),
    });
  });
});
