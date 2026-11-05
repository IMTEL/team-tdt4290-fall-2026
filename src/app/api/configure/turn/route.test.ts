// @vitest-environment node
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { findJobTemplate, jobConfiguration } from '@/data/job-templates';
import { findBuiltInTemplate } from '@/data/templates';
import { LEGAL_TEMPLATE_LIMITS } from '@/domain/legalTemplate';
import { getSessionToken } from '@/lib/session-tokens';
import { askAgent, getProfile, getTemplate, RagdollError } from '@/server/ragdoll';
import { chatRetryAfter, MAX_CHAT_REQUESTS, resetChatLimits } from '@/server/rateLimit';
import { POST } from './route';

// The adapter, buildBriefing and parseAnswers have their own tests. Here we only check what the
// route adds: the session check, validating the body, sending the briefing first, and reporting
// when the configuration is done with the interviewer from the chosen template.
vi.mock('@/lib/session-tokens', () => ({ getSessionToken: vi.fn() }));
vi.mock('@/server/ragdoll', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/server/ragdoll')>();
  return { ...original, askAgent: vi.fn(), getTemplate: vi.fn(), getProfile: vi.fn() };
});

const getSessionTokenMock = vi.mocked(getSessionToken);
const askAgentMock = vi.mocked(askAgent);
const getTemplateMock = vi.mocked(getTemplate);
const getProfileMock = vi.mocked(getProfile);

const messages = [
  { role: 'assistant', content: 'Hei! Hvilken stilling skal jobbsøkeren øve til?' },
  { role: 'user', content: 'Butikkmedarbeider' },
];

const finalReply = `KONFIGURASJON
Stilling: Butikkmedarbeider
Bransje: Varehandel (privat)
Bedrift: Nærbutikken AS
Intervjutype: første intervju
Jobbsøker: under 25, lite erfaring
Vanskelighetsgrad: lett | Antall spørsmål: 6 | Oppfølgingsspørsmål: ja
Egne spørsmål: ingen`;

function turnRequest(body: unknown) {
  return new NextRequest('http://localhost/api/configure/turn', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  resetChatLimits();
  getSessionTokenMock.mockResolvedValue('session-token');
  // Only built-in templates exist unless a test saves one.
  getTemplateMock.mockRejectedValue(new RagdollError('not-found', 'no template'));
  vi.stubEnv('RAGDOLL_CONFIGURATOR_AGENT_ID', 'configurator-123');
  vi.stubEnv('RAGDOLL_CONFIGURATOR_ACCESS_KEY', 'configurator-key');
  // The route logs problems on purpose; keep the test output clean.
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  getSessionTokenMock.mockReset();
  askAgentMock.mockReset();
  getTemplateMock.mockReset();
  getProfileMock.mockReset();
});

describe('POST /api/configure/turn', () => {
  it('asks the configurator and reports that the configuration is not done yet', async () => {
    askAgentMock.mockResolvedValue('Hvilken bransje er stillingen i?');

    const res = await POST(turnRequest({ templateId: 'teamleder', messages }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      reply: 'Hvilken bransje er stillingen i?',
      configuration: null,
      sources: {},
      done: false,
    });
    expect(askAgentMock).toHaveBeenCalledWith(
      { id: 'configurator-123', accessKey: 'configurator-key' },
      [{ role: 'user', content: expect.stringContaining('OPPSETT FRA VERKTØYET') }, ...messages],
    );
  });

  it('briefs the configurator on the chosen agent type, without what a template decides', async () => {
    askAgentMock.mockResolvedValue('Hvilken bransje er stillingen i?');

    await POST(turnRequest({ agentType: 'interviewer', templateId: 'teamleder', messages }));

    const [, [briefing]] = askAgentMock.mock.calls[0];
    expect(briefing.content).toContain('1. Stilling: Hvilken stilling skal jobbsøkeren øve til?');
    expect(briefing.content).toContain(
      `- Intervjuer: ${findBuiltInTemplate('teamleder')?.persona}`,
    );
    expect(briefing.content).not.toMatch(/^Intervjuer:/m);
  });

  it('briefs the configurator on both the interviewer and the stillingsmal', async () => {
    askAgentMock.mockResolvedValue('Hvilken bedrift er det?');

    await POST(
      turnRequest({ templateId: 'teamleder', jobTemplateId: 'helsefagarbeider', messages }),
    );

    const [, [briefing]] = askAgentMock.mock.calls[0];
    const { stilling, bransje } = jobConfiguration(findJobTemplate('helsefagarbeider')!);
    expect(briefing.content).toContain(`- Stilling: ${stilling}`);
    expect(briefing.content).toContain(`- Bransje: ${bransje}`);
    expect(briefing.content).toContain(
      `- Intervjuer: ${findBuiltInTemplate('teamleder')?.persona}`,
    );
    expect(briefing.content).toContain('1. Bedrift:');
    expect(briefing.content).not.toMatch(/^Stilling:/m);
  });

  it('takes the job and industry from a stillingsmal, without lines for them', async () => {
    askAgentMock.mockResolvedValue(
      finalReply
        .replace('Stilling: Butikkmedarbeider\n', '')
        .replace('Bransje: Varehandel (privat)\n', ''),
    );

    const res = await POST(
      turnRequest({ templateId: 'teamleder', jobTemplateId: 'lagermedarbeider', messages }),
    );
    const body = await res.json();

    expect(body.done).toBe(true);
    expect(body.configuration).toMatchObject({
      ...jobConfiguration(findJobTemplate('lagermedarbeider')!),
      intervjuer: findBuiltInTemplate('teamleder')?.persona,
    });
    expect(body.configuration.bransje).toBe('Transport og logistikk (privat)');
    // Only the interviewer and job seeker remember a source; the edit form has no industry choice.
    expect(body.sources).toEqual({ intervjuer: { kind: 'template', id: 'teamleder' } });
  });

  it('briefs on the interviewer when the client sends no agent type', async () => {
    askAgentMock.mockResolvedValue('Hvilken bransje er stillingen i?');

    await POST(turnRequest({ messages }));

    const [, [briefing]] = askAgentMock.mock.calls[0];
    expect(briefing.content).toContain('en AI-intervjuer');
  });

  it('returns the configuration, with the interviewer from the template, when the block is complete', async () => {
    askAgentMock.mockResolvedValue(finalReply);

    const res = await POST(turnRequest({ templateId: 'teamleder', messages }));
    const body = await res.json();

    expect(body.done).toBe(true);
    expect(body.configuration.stilling).toBe('Butikkmedarbeider');
    expect(body.configuration.intervjuer).toBe(findBuiltInTemplate('teamleder')?.persona);
    expect(body.sources).toEqual({ intervjuer: { kind: 'template', id: 'teamleder' } });
  });

  it('takes the interviewer from a template the counsellor saved in RAGdoll', async () => {
    getTemplateMock.mockResolvedValue({
      id: 'saved-1',
      type: 'interviewer',
      name: 'Butikksjef',
      description: 'Vennlig.',
      content: { focus: [], persona: 'Intervjueren er butikksjef.' },
    });
    askAgentMock.mockResolvedValue(finalReply);

    const res = await POST(turnRequest({ templateId: 'saved-1', messages }));
    const body = await res.json();

    expect(getTemplateMock).toHaveBeenCalledWith('session-token', 'saved-1');
    expect(body.configuration.intervjuer).toBe('Intervjueren er butikksjef.');
    expect(body.sources).toEqual({ intervjuer: { kind: 'template', id: 'saved-1' } });
  });

  it('answers 502 and asks nothing when RAGdoll fails to load a saved template', async () => {
    getTemplateMock.mockRejectedValue(new RagdollError('unreachable', 'down'));

    const res = await POST(turnRequest({ templateId: 'saved-1', messages }));

    expect(res.status).toBe(502);
    expect(askAgentMock).not.toHaveBeenCalled();
  });

  it('takes the interviewer from the block when there is no template', async () => {
    askAgentMock.mockResolvedValue(
      finalReply.replace(
        'Intervjutype: første intervju',
        'Intervjutype: første intervju\nIntervjuer: butikksjef, vennlig',
      ),
    );

    const res = await POST(turnRequest({ messages }));
    const body = await res.json();

    expect(body.done).toBe(true);
    expect(body.configuration.intervjuer).toBe('butikksjef, vennlig');
    expect(body.sources).toEqual({});
  });

  it('takes the job seeker from the chosen profile, together with the template', async () => {
    getProfileMock.mockResolvedValue({
      id: 'profile-1',
      label: 'Profil A',
      age_range: '18-24',
      experience_level: null,
      education: '',
      work_experience: '',
      languages: [],
      practice_areas: ['Mestre nervøsitet'],
      notes: 'Skal ikke med',
    });
    askAgentMock.mockResolvedValue(finalReply.replace(/^Jobbsøker:.*\n/m, ''));

    const res = await POST(
      turnRequest({ templateId: 'teamleder', profileId: 'profile-1', messages }),
    );
    const body = await res.json();

    expect(getProfileMock).toHaveBeenCalledWith('session-token', 'profile-1');
    expect(body.done).toBe(true);
    expect(body.configuration.jobbsoker).toBe(
      'aldersgruppe 18–24 år; vil øve på: mestre nervøsitet',
    );
    expect(body.configuration.intervjuer).toBe(findBuiltInTemplate('teamleder')?.persona);
    expect(body.sources).toEqual({
      intervjuer: { kind: 'template', id: 'teamleder' },
      jobbsoker: { kind: 'profile', id: 'profile-1' },
    });
  });

  it('answers 400 and asks nothing when the profile is not one of the counsellor’s', async () => {
    getProfileMock.mockRejectedValue(new RagdollError('not-found', 'no profile'));

    const res = await POST(turnRequest({ profileId: 'profile-2', messages }));

    expect(res.status).toBe(400);
    expect(askAgentMock).not.toHaveBeenCalled();
  });

  it('fills in Lovverk from the chosen legal templates, built in and saved', async () => {
    getTemplateMock.mockResolvedValue({
      id: 'legal-1',
      type: 'legal-framework',
      name: 'Arbeidsmiljøloven § 9-3',
      description: 'Helseopplysninger',
      content: { text: 'Ikke spør om helse.' },
    });
    askAgentMock.mockResolvedValue(finalReply);

    const res = await POST(
      turnRequest({
        templateId: 'teamleder',
        legalTemplateIds: ['builtin-legal-hiring-rights', 'legal-1'],
        messages,
      }),
    );

    const { configuration, sources } = await res.json();
    expect(configuration.lovverk).toMatch(/^Rettigheter i ansettelsesprosessen:\n/);
    expect(configuration.lovverk).toContain('Arbeidsmiljøloven § 9-3:\nIkke spør om helse.');
    expect(sources.lovverk).toEqual({
      kind: 'legal',
      ids: ['builtin-legal-hiring-rights', 'legal-1'],
    });
    const [, [briefing]] = askAgentMock.mock.calls[0];
    expect(briefing.content).toContain('- Lovverk: Rettigheter i ansettelsesprosessen:');
  });

  it('leaves Lovverk empty without legal templates', async () => {
    askAgentMock.mockResolvedValue(finalReply);

    const res = await POST(turnRequest({ templateId: 'teamleder', messages }));

    expect((await res.json()).configuration.lovverk).toBe('');
  });

  it('answers 400 and asks nothing for a template that is not a legal template', async () => {
    getTemplateMock.mockResolvedValue({
      id: 'interviewer-1',
      type: 'interviewer',
      name: 'Butikksjef',
      description: 'Vennlig',
      content: { focus: [], persona: 'En butikksjef' },
    });

    const res = await POST(turnRequest({ legalTemplateIds: ['interviewer-1'], messages }));

    expect(res.status).toBe(400);
    expect(askAgentMock).not.toHaveBeenCalled();
  });

  it('answers 400 for legal template ids that are not a list of distinct ids', async () => {
    for (const legalTemplateIds of [
      'legal-1',
      [''],
      ['a', 'a'],
      Array.from({ length: LEGAL_TEMPLATE_LIMITS.perAgent + 1 }, (_, i) => `id-${i}`),
    ]) {
      const res = await POST(turnRequest({ legalTemplateIds, messages }));
      expect(res.status).toBe(400);
    }
    expect(askAgentMock).not.toHaveBeenCalled();
  });

  it('answers 401 and asks nothing when the user is not logged in', async () => {
    getSessionTokenMock.mockResolvedValue(null);

    const res = await POST(turnRequest({ templateId: 'teamleder', messages }));

    expect(res.status).toBe(401);
    expect(askAgentMock).not.toHaveBeenCalled();
  });

  it('answers 429 and asks nothing when the counsellor has sent too many messages', async () => {
    for (let i = 0; i < MAX_CHAT_REQUESTS; i++) chatRetryAfter('session-token');

    const res = await POST(turnRequest({ templateId: 'teamleder', messages }));

    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBeTruthy();
    expect(askAgentMock).not.toHaveBeenCalled();
  });

  it.each([
    ['the body is not JSON', '{not json'],
    ['messages is missing', { templateId: 'teamleder' }],
    ['messages is empty', { templateId: 'teamleder', messages: [] }],
    [
      'a message has an unknown role',
      { templateId: 'teamleder', messages: [{ role: 'system', content: 'Hei' }] },
    ],
    ['the template is unknown', { templateId: 'finnes-ikke', messages }],
    ['the agent type is unknown', { agentType: 'finnes-ikke', messages }],
    ['the job template is unknown', { jobTemplateId: 'finnes-ikke', messages }],
    ['the job template id is empty', { jobTemplateId: '', messages }],
    ['the agent type is only planned', { agentType: 'teacher', messages }],
  ])('answers 400 when %s', async (_case, body) => {
    const res = await POST(turnRequest(body));

    expect(res.status).toBe(400);
    expect(askAgentMock).not.toHaveBeenCalled();
  });

  it('answers 500 when the configurator agent is not configured', async () => {
    vi.stubEnv('RAGDOLL_CONFIGURATOR_ACCESS_KEY', '');

    const res = await POST(turnRequest({ templateId: 'teamleder', messages }));

    expect(res.status).toBe(500);
    expect(askAgentMock).not.toHaveBeenCalled();
  });

  it('turns a RAGdoll timeout into 504 without passing on its message', async () => {
    askAgentMock.mockRejectedValue(new RagdollError('timeout', 'secret internal detail'));

    const res = await POST(turnRequest({ templateId: 'teamleder', messages }));

    expect(res.status).toBe(504);
    expect(JSON.stringify(await res.json())).not.toContain('secret internal detail');
  });
});
