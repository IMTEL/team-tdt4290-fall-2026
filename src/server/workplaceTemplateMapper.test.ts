// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  fromRagdollIndustryTemplate,
  fromRagdollJobTemplate,
  parseNewIndustryTemplate,
  parseNewJobTemplate,
  toRagdollIndustryTemplate,
  toRagdollJobTemplate,
} from './workplaceTemplateMapper';

const job = {
  title: 'Lagermedarbeider natt',
  industry: 'Logistikk',
  sector: 'privat' as const,
  description: 'Plukk og pakking om natten.',
  tasks: ['Plukking', 'Truck'],
  jobDescription: 'Jobber på et stort lager om natten.',
};

describe('parseNewJobTemplate', () => {
  it('keeps the fields, trimmed, and nothing else', () => {
    expect(
      parseNewJobTemplate({
        ...job,
        title: '  Lagermedarbeider natt ',
        tasks: [' Plukking', '', 'Truck'],
        owner: 'x',
      }),
    ).toEqual(job);
  });

  it('accepts a stillingsmal without typical tasks', () => {
    expect(parseNewJobTemplate({ ...job, tasks: [] })).toEqual({ ...job, tasks: [] });
  });

  it('is null when a required field is missing, empty or too long', () => {
    expect(parseNewJobTemplate({ ...job, title: ' ' })).toBeNull();
    expect(parseNewJobTemplate({ ...job, industry: undefined })).toBeNull();
    expect(parseNewJobTemplate({ ...job, sector: 'ikke-oppgitt' })).toBeNull();
    expect(parseNewJobTemplate({ ...job, jobDescription: 'x'.repeat(2001) })).toBeNull();
    expect(parseNewJobTemplate({ ...job, tasks: 'Plukking' })).toBeNull();
    expect(parseNewJobTemplate({ ...job, tasks: Array(9).fill('Plukking') })).toBeNull();
    expect(parseNewJobTemplate(null)).toBeNull();
  });
});

describe('stillingsmaler in RAGdoll', () => {
  it('reads back what it stores', () => {
    const stored = { id: 'job-1', ...toRagdollJobTemplate(job) };
    expect(stored.type).toBe('job-template');
    expect(fromRagdollJobTemplate(stored)).toEqual({ id: 'job-1', ...job });
  });

  it('is null for another type, or content of the wrong shape', () => {
    const stored = { id: 'job-1', ...toRagdollJobTemplate(job) };
    expect(fromRagdollJobTemplate({ ...stored, type: 'interviewer' })).toBeNull();
    expect(
      fromRagdollJobTemplate({ ...stored, content: { ...stored.content, sector: 'x' } }),
    ).toBeNull();
    expect(
      fromRagdollJobTemplate({ ...stored, content: { ...stored.content, tasks: [1] } }),
    ).toBeNull();
  });
});

describe('bransjemaler', () => {
  it('keeps the name and the description, trimmed', () => {
    expect(parseNewIndustryTemplate({ name: ' Logistikk ', description: 'Lager.', x: 1 })).toEqual({
      name: 'Logistikk',
      description: 'Lager.',
    });
    expect(parseNewIndustryTemplate({ name: '', description: 'Lager.' })).toBeNull();
    expect(
      parseNewIndustryTemplate({ name: 'Logistikk', description: 'x'.repeat(301) }),
    ).toBeNull();
  });

  it('reads back what it stores, and only its own type', () => {
    const stored = {
      id: 'industry-1',
      ...toRagdollIndustryTemplate({ name: 'Logistikk', description: 'Lager.' }),
    };
    expect(stored.type).toBe('industry-template');
    expect(fromRagdollIndustryTemplate(stored)).toEqual({
      id: 'industry-1',
      name: 'Logistikk',
      description: 'Lager.',
    });
    expect(fromRagdollIndustryTemplate({ ...stored, type: 'job-template' })).toBeNull();
  });
});
