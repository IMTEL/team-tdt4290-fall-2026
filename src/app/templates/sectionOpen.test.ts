import { describe, expect, it } from 'vitest';

import { parseTemplateSection, sectionFromLocation, templatesSectionHref } from './sectionOpen';

describe('templatesSectionHref', () => {
  it('opens Maler on the named group', () => {
    expect(templatesSectionHref('lovverk')).toBe('/templates?seksjon=lovverk#lovverk');
  });
});

describe('sectionFromLocation', () => {
  it('reads the group from the query, then from the hash', () => {
    expect(parseTemplateSection('lovverk')).toBe('lovverk');
    expect(parseTemplateSection('finnes-ikke')).toBeNull();
    expect(sectionFromLocation({ search: '?seksjon=lovverk', hash: '' })).toBe('lovverk');
    expect(sectionFromLocation({ search: '', hash: '#lovverk' })).toBe('lovverk');
    expect(sectionFromLocation({ search: '?seksjon=lovverk', hash: '#stillingsmaler' })).toBe(
      'lovverk',
    );
    expect(sectionFromLocation({ search: '', hash: '' })).toBeNull();
  });
});
