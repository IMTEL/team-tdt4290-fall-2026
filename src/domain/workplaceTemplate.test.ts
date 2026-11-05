// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { builtInJobTemplates } from '@/data/job-templates';
import {
  industryContext,
  industryNames,
  industryNameTaken,
  isBuiltInJob,
} from './workplaceTemplate';

const ownJob = { ...builtInJobTemplates[0], id: 'job-1', industry: 'Logistikk' };

describe('industryNames', () => {
  it('lists the stillingsmaler’s industries, then the bransjemaler without any, each once', () => {
    expect(
      industryNames(
        [ownJob, builtInJobTemplates[0], builtInJobTemplates[0]],
        [
          { id: 'i-1', name: 'logistikk', description: '', context: '' },
          { id: 'i-2', name: 'Renhold', description: '', context: '' },
        ],
      ),
    ).toEqual(['Logistikk', 'Helse og omsorg', 'Renhold']);
  });
});

describe('industryContext', () => {
  it('finds the bransjemal’s text by name, whatever its case', () => {
    const industries = [
      { id: 'i-1', name: 'Logistikk', description: '', context: 'Truckførerbevis er vanlig.' },
    ];
    expect(industryContext(' logistikk ', industries)).toBe('Truckførerbevis er vanlig.');
    expect(industryContext('Renhold', industries)).toBe('');
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
