// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { saveTemplate } from './api';

const template = {
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
