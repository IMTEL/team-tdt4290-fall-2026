import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { extractPromptText } from './promptSource';

describe('extractPromptText', () => {
  it('takes the text inside the first ```text block', () => {
    expect(
      extractPromptText('# Title\n\n```text\nDu er en observatør.\n\n## Samtalen\n```\n'),
    ).toBe('Du er en observatør.\n\n## Samtalen');
  });

  it('is empty when there is no text block, so the page can hide the prompt', () => {
    expect(extractPromptText('# Title\n\nNo block.')).toBe('');
  });
});

describe('prompts/observer.nb.md', () => {
  const prompt = extractPromptText(
    readFileSync(join(process.cwd(), 'prompts/observer.nb.md'), 'utf8'),
  );

  it('is the observer prompt that RAGdoll should have', () => {
    expect(prompt.startsWith('Du er en observatør')).toBe(true);
  });

  it('asks for each point as one question and whether the answer went well or can be better', () => {
    expect(prompt).toContain(
      'Hvert punkt gjelder ett spørsmål intervjueren stilte, og sier hvordan svaret ble vurdert: enten som noe som gikk bra, eller som noe som kan bli bedre.',
    );
  });

  it('can summarise counsellor ratings of the interviewer instead of judging the job seeker', () => {
    expect(prompt).toContain('SAMMENDRAG AV VURDERINGER:');
    expect(prompt).toContain('Da skal du ikke gi tilbakemelding til jobbsøkeren.');
  });
});
