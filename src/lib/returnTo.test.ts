import { describe, expect, it } from 'vitest';

import { returnPath, withReturnTo } from './returnTo';

describe('returnPath', () => {
  it('keeps a path on this site, with its query', () => {
    expect(returnPath('/configure?type=interviewer&step=intervjuer')).toBe(
      '/configure?type=interviewer&step=intervjuer',
    );
    expect(returnPath(['/templates'])).toBe('/templates');
  });

  it('drops a target that leaves the site', () => {
    expect(returnPath('https://example.com')).toBeNull();
    expect(returnPath('//example.com')).toBeNull();
    expect(returnPath('\\templates')).toBeNull();
    expect(returnPath(undefined)).toBeNull();
  });
});

describe('withReturnTo', () => {
  it('adds returnTo to the link', () => {
    expect(
      withReturnTo('/templates/saved-1/edit', '/configure?type=interviewer&step=intervjuer'),
    ).toBe(
      '/templates/saved-1/edit?returnTo=%2Fconfigure%3Ftype%3Dinterviewer%26step%3Dintervjuer',
    );
  });

  it('leaves the link as it is when there is nowhere to return', () => {
    expect(withReturnTo('/templates/saved-1/edit', undefined)).toBe('/templates/saved-1/edit');
    expect(withReturnTo('/templates/saved-1/edit', 'https://example.com')).toBe(
      '/templates/saved-1/edit',
    );
  });
});
