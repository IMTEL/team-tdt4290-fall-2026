import { describe, expect, it } from 'vitest';

import { loadObserverPrompt } from './observerPrompt';

describe('loadObserverPrompt', () => {
  it('reads the observer prompt from prompts/observer.nb.md', () => {
    const prompt = loadObserverPrompt();
    expect(prompt.startsWith('Du er en observatør')).toBe(true);
    expect(prompt).toContain('Bra: [sitat] | [kommentar] | [tips]');
  });
});
