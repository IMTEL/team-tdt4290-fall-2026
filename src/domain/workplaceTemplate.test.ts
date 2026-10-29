// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { industryTemplates } from '@/data/industry-templates';
import { industryNames, industryNameTaken, isBuiltInJob } from './workplaceTemplate';

const ownJob = { ...industryTemplates[0], id: 'job-1', industry: 'Logistikk' };

describe('industryNames', () => {
  it('lists the stillingsmaler’s industries, then the bransjemaler without any, each once', () => {
    expect(
      industryNames(
        [ownJob, industryTemplates[0], industryTemplates[0]],
        [
          { id: 'i-1', name: 'logistikk', description: '' },
          { id: 'i-2', name: 'Renhold', description: '' },
        ],
      ),
    ).toEqual(['Logistikk', 'Helse og omsorg', 'Renhold']);
  });
});

describe('industryNameTaken', () => {
  it('compares names without case or spaces at the ends', () => {
    expect(industryNameTaken(' varehandel ', ['Varehandel'])).toBe(true);
    expect(industryNameTaken('Logistikk', ['Varehandel'])).toBe(false);
  });
});

describe('isBuiltInJob', () => {
  it('knows the stillingsmaler that come with the app', () => {
    expect(isBuiltInJob('helsefagarbeider')).toBe(true);
    expect(isBuiltInJob('job-1')).toBe(false);
  });
});
