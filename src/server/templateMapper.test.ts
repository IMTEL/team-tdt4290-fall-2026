import { describe, expect, it } from 'vitest';

import { fromRagdollTemplate, parseNewTemplate, toRagdollTemplate } from './templateMapper';

const template = {
  title: 'Butikksjef',
  description: 'Vennlig og direkte.',
  focus: ['Service', 'Samarbeid'],
  persona: 'Intervjueren er butikksjef i en dagligvarebutikk.',
};

describe('parseNewTemplate', () => {
  it('trims the fields and keeps only the ones we store', () => {
    expect(
      parseNewTemplate({ ...template, title: '  Butikksjef ', focus: [' Service '], extra: 'x' }),
    ).toEqual({ ...template, focus: ['Service'] });
  });

  it.each([
    ['the body is not an object', null],
    ['the title is empty', { ...template, title: '  ' }],
    ['the title is too long', { ...template, title: 'x'.repeat(81) }],
    ['the persona is missing', { ...template, persona: undefined }],
    ['focus is not a list', { ...template, focus: 'Service' }],
    ['focus has too many items', { ...template, focus: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] }],
    ['a focus item is not text', { ...template, focus: ['Service', 3] }],
  ])('returns null when %s', (_case, body) => {
    expect(parseNewTemplate(body)).toBeNull();
  });
});

describe('toRagdollTemplate and fromRagdollTemplate', () => {
  it('stores the template as an interviewer template, and reads it back', () => {
    const stored = toRagdollTemplate(template);

    expect(stored).toEqual({
      type: 'interviewer',
      name: 'Butikksjef',
      description: 'Vennlig og direkte.',
      content: { focus: ['Service', 'Samarbeid'], persona: template.persona },
    });
    expect(fromRagdollTemplate({ ...stored, id: 'template-1' })).toEqual({
      ...template,
      id: 'template-1',
    });
  });

  it('skips templates of another type', () => {
    const stored = { ...toRagdollTemplate(template), id: 'template-1', type: 'other' };

    expect(fromRagdollTemplate(stored)).toBeNull();
  });

  it('skips templates whose content has the wrong shape', () => {
    const stored = { ...toRagdollTemplate(template), id: 'template-1', content: { focus: 'x' } };

    expect(fromRagdollTemplate(stored)).toBeNull();
  });
});
