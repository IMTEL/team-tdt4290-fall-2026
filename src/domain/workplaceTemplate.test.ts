// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { industryTemplates } from '@/data/industry-templates';
import { industryNames, isBuiltInJob } from './workplaceTemplate';

const ownJob = { ...industryTemplates[0], id: 'job-1', industry: 'Logistikk' };

describe('industryNames', () => {
  it('lists the stillingsmaler’s industries in their order, each once whatever its case', () => {
    expect(
      industryNames([ownJob, industryTemplates[0], { ...ownJob, industry: 'logistikk' }]),
    ).toEqual(['Logistikk', 'Helse og omsorg']);
  });
});

describe('isBuiltInJob', () => {
  it('knows the stillingsmaler that come with the app', () => {
    expect(isBuiltInJob('helsefagarbeider')).toBe(true);
    expect(isBuiltInJob('job-1')).toBe(false);
  });
});
