// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { deleteTemplate, fetchTemplate, saveTemplate, updateTemplate } from './api';

const template = {
  agentType: 'interviewer',
  title: 'Butikksjef',
  description: 'Vennlig og direkte.',
  focus: ['Service'],
  persona: 'Intervjueren er butikksjef.',
};

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe('saveTemplate', () => {
  it('posts the template and returns its id', async () => {
    fetchMock.mockResolvedValue(
      Response.json({ template: { ...template, id: 'template-1' } }, { status: 201 }),
    );

    await expect(saveTemplate(template)).resolves.toBe('template-1');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/templates');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toEqual(template);
  });

  it.each([
    [401, 'Du er logget ut'],
    [400, 'Malen ble ikke godtatt'],
    [502, 'Noe gikk galt'],
  ])('turns %i into a Norwegian message, never the server’s text', async (status, message) => {
    fetchMock.mockResolvedValue(Response.json({ error: 'Technical detail' }, { status }));

    const error = await saveTemplate(template).catch((e: Error) => e);

    expect((error as Error).message).toContain(message);
    expect((error as Error).message).not.toContain('Technical detail');
  });

  it('says so when the server cannot be reached', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(saveTemplate(template)).rejects.toThrow('Fikk ikke kontakt med serveren');
  });
});

describe('fetchTemplate', () => {
  it('returns the saved template', async () => {
    fetchMock.mockResolvedValue(Response.json({ template: { ...template, id: 'template-1' } }));

    await expect(fetchTemplate('template-1')).resolves.toEqual({ ...template, id: 'template-1' });
    expect(fetchMock.mock.calls[0][0]).toBe('/api/templates/template-1');
  });

  it('returns null when the counsellor has no template with that id', async () => {
    fetchMock.mockResolvedValue(Response.json({ error: 'Not found' }, { status: 404 }));

    await expect(fetchTemplate('template-1')).resolves.toBeNull();
  });

  it('throws a Norwegian message for other failures', async () => {
    fetchMock.mockResolvedValue(Response.json({ error: 'Not signed in' }, { status: 401 }));

    await expect(fetchTemplate('template-1')).rejects.toThrow('Du er logget ut');
  });
});

describe('updateTemplate', () => {
  it('puts the changes to the template', async () => {
    fetchMock.mockResolvedValue(Response.json({ template: { ...template, id: 'template-1' } }));

    await expect(updateTemplate('template-1', template)).resolves.toBeUndefined();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/templates/template-1');
    expect(init?.method).toBe('PUT');
    expect(JSON.parse(init?.body as string)).toEqual(template);
  });

  it('says the template is gone when it was deleted (404)', async () => {
    fetchMock.mockResolvedValue(Response.json({ error: 'Not found' }, { status: 404 }));

    await expect(updateTemplate('template-1', template)).rejects.toThrow('Fant ikke malen');
  });
});

describe('deleteTemplate', () => {
  it('deletes the template', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(deleteTemplate('template-1')).resolves.toBeUndefined();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/templates/template-1');
    expect(init?.method).toBe('DELETE');
  });

  it('throws a Norwegian message when it fails', async () => {
    fetchMock.mockResolvedValue(Response.json({ error: 'Error' }, { status: 502 }));

    await expect(deleteTemplate('template-1')).rejects.toThrow('Noe gikk galt');
  });
});
