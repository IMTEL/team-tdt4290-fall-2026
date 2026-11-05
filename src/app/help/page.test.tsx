import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FORM_SECTIONS } from '@/app/configure/formSections';
import HelpPage from './page';

describe('HelpPage', () => {
  it('links every entry in the contents to the section with that heading', () => {
    const { container } = render(<HelpPage />);

    const links = within(screen.getByRole('navigation', { name: 'Innhold' })).getAllByRole('link');
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      const id = link.getAttribute('href')?.replace(/^#/, '') ?? '';
      const section = container.querySelector(`[id="${id}"]`);
      expect(section, `no section for ${link.getAttribute('href')}`).not.toBeNull();
      expect(within(section as HTMLElement).getByRole('heading', { level: 2 })).toHaveTextContent(
        link.textContent ?? '',
      );
    }
  });

  it('has a part, with its heading, at the anchor of every section of the new agent form', () => {
    // The form links each of its sections to `/help#<helpId>`.
    const { container } = render(<HelpPage />);

    for (const { title, helpId } of FORM_SECTIONS) {
      const part = container.querySelector(`[id="${helpId}"]`);
      expect(part, `no part for #${helpId}`).not.toBeNull();
      expect(within(part as HTMLElement).getByRole('heading', { level: 3 })).toHaveTextContent(
        title,
      );
    }
  });

  it('links the kinds of templates in the steps to their entry in the glossary', () => {
    const { container } = render(<HelpPage />);

    const link = within(container.querySelector('[id="intervjuer"]') as HTMLElement).getAllByRole(
      'link',
      { name: 'intervjuermal' },
    )[0];
    const target = container.querySelector(`[id="${link.getAttribute('href')?.slice(1)}"]`);
    expect(target).toHaveTextContent('Intervjuermal');
  });

  it('uses each anchor once, so a link cannot land on the wrong section', () => {
    const { container } = render(<HelpPage />);

    const ids = [...container.querySelectorAll('section[id]')].map((section) => section.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
