import { describe, expect, it } from 'vitest';

import type { MessageFeedback } from './messageFeedback';
import {
  FEEDBACK_SECTION_HEADING,
  MAX_DETAILED_RATINGS,
  RATING_SUMMARY_MARKER,
  formatFeedbackSection,
  formatRatingsForObserver,
  parseObserverRatingSummary,
  stripFeedbackSection,
  summarizeRatings,
  withFeedbackSection,
} from './interviewerFeedbackPrompt';

const prompt = 'Du er en intervjuer.\n\n## Regler\n- Svar på norsk.';

function rating(
  rating: 'good' | 'bad',
  comment = '',
  userMessage = 'Jeg har jobbet i butikk i fem år.',
  agentMessage = 'Hvorfor søker du her?',
): MessageFeedback {
  return {
    id: `id-${rating}-${comment || 'none'}`,
    rating,
    agentMessage,
    userMessage,
    comment,
    createdAt: '2026-11-05T12:00:00',
  };
}

describe('summarizeRatings', () => {
  it('counts how many replies went well and how many were bad', () => {
    expect(summarizeRatings([rating('good'), rating('good'), rating('bad')])).toBe(
      'Veilederen har vurdert 3 svar: 2 gikk bra, og 1 var dårlig.',
    );
    expect(summarizeRatings([rating('good')])).toBe(
      'Veilederen har vurdert 1 svar, og det gikk bra.',
    );
    expect(summarizeRatings([rating('bad'), rating('bad')])).toBe(
      'Veilederen har vurdert 2 svar, og alle var dårlige.',
    );
  });
});

describe('formatFeedbackSection', () => {
  it('writes good and bad ratings as things to do more of and things to avoid', () => {
    const section = formatFeedbackSection([
      rating('good', 'Bra at du spør om erfaring.'),
      rating('bad', 'Ikke avbryt.'),
    ]);

    expect(section).toContain(FEEDBACK_SECTION_HEADING);
    expect(section).toContain('Veilederen har vurdert 2 svar: 1 gikk bra, og 1 var dårlig.');
    expect(section).toContain('### Gjør mer av dette');
    expect(section).toContain('### Unngå dette');
    expect(section).toContain('Jobbsøkeren sa: «Jeg har jobbet i butikk i fem år.»');
    expect(section).toContain('Du svarte: «Hvorfor søker du her?»');
    expect(section).toContain('Veilederen: Bra at du spør om erfaring.');
    expect(section).toContain('Veilederen: Ikke avbryt.');
    expect(section).not.toContain('### Sammendrag');
  });

  it('leaves the comment out when the counsellor did not write one', () => {
    expect(formatFeedbackSection([rating('good')])).not.toContain('Veilederen:');
  });

  it('is empty when there are no ratings', () => {
    expect(formatFeedbackSection([])).toBe('');
  });

  it('summarises every rating when there are more than will be quoted in full', () => {
    const ratings = Array.from({ length: MAX_DETAILED_RATINGS + 2 }, (_, i) =>
      rating(i % 2 === 0 ? 'good' : 'bad', `nr ${i}`),
    );
    const section = formatFeedbackSection(ratings);

    expect(section).toContain(
      `Veilederen har vurdert ${ratings.length} svar: 6 gikk bra, og 6 var dårlige.`,
    );
    expect(section).toContain('### Sammendrag');
    expect(section).toContain('Gjør mer av: nr 0; nr 2');
    expect(section).toContain('Unngå: nr 1; nr 3');
    expect(section).toContain('nr 11');
    expect(section).toContain('### Siste vurderinger');
    expect(section).toContain('Veilederen: nr 0');
    expect(section).toContain('Veilederen: nr 9');
    expect(section).not.toContain('Veilederen: nr 10');
  });

  it('uses the observer’s prose instead of listing every comment', () => {
    const ratings = Array.from({ length: MAX_DETAILED_RATINGS + 1 }, (_, i) =>
      rating('good', `nr ${i}`),
    );
    const section = formatFeedbackSection(
      ratings,
      MAX_DETAILED_RATINGS,
      ratings.length,
      'Still ett spørsmål om gangen, og spør om erfaring før motivasjon.',
    );

    expect(section).toContain('Still ett spørsmål om gangen, og spør om erfaring før motivasjon.');
    expect(section).not.toContain('Gjør mer av: nr 0');
  });
});

describe('stripFeedbackSection', () => {
  it('removes a ratings block at the end, and leaves a prompt without one as it is', () => {
    const withRatings = withFeedbackSection(prompt, [rating('bad', 'Spør om erfaring først.')]);
    expect(stripFeedbackSection(withRatings)).toBe(prompt);
    expect(stripFeedbackSection(prompt)).toBe(prompt);
  });
});

describe('withFeedbackSection', () => {
  it('appends the ratings and replaces an older block, so a new rating does not stack', () => {
    const once = withFeedbackSection(prompt, [rating('good', 'Første.')]);
    const twice = withFeedbackSection(once, [rating('bad', 'Andre.')]);

    expect(twice.startsWith(prompt)).toBe(true);
    expect(twice).toContain('Veilederen: Andre.');
    expect(twice).not.toContain('Veilederen: Første.');
    expect(twice.split(FEEDBACK_SECTION_HEADING)).toHaveLength(2);
  });

  it('drops the block when every rating is undone', () => {
    expect(withFeedbackSection(withFeedbackSection(prompt, [rating('good')]), [])).toBe(prompt);
  });

  it('keeps older comments in the summary when there are more ratings than quoted in full', () => {
    const ratings = Array.from({ length: MAX_DETAILED_RATINGS + 3 }, (_, i) =>
      rating('good', `nr ${i}`),
    );
    const written = withFeedbackSection(prompt, ratings);

    expect(written).toContain('### Sammendrag');
    expect(written).toContain(`nr ${MAX_DETAILED_RATINGS}`);
    expect(written).toContain(`nr ${MAX_DETAILED_RATINGS + 2}`);
    expect(written).toContain('Veilederen: nr 0');
    expect(written).not.toContain(`Veilederen: nr ${MAX_DETAILED_RATINGS}`);
  });

  it('fits the prompt length by dropping quoted replies before summary comments', () => {
    const ratings = Array.from({ length: MAX_DETAILED_RATINGS + 2 }, (_, i) =>
      rating('good', `Kommentar ${i}`, 'svar', 'spørsmål'),
    );
    const full = withFeedbackSection(prompt, ratings);
    const tight = withFeedbackSection(prompt, ratings, prompt.length + 700);

    expect(full.length).toBeGreaterThan(tight.length);
    expect(tight).toContain('Veilederen har vurdert 12 svar');
    expect(tight).toContain('Kommentar 0');
    expect(tight).toContain('Kommentar 11');
  });

  it('puts an observer summary in the block when there are many ratings', () => {
    const ratings = Array.from({ length: MAX_DETAILED_RATINGS + 1 }, (_, i) =>
      rating('good', `nr ${i}`),
    );
    const written = withFeedbackSection(
      prompt,
      ratings,
      undefined,
      'Unngå å avbryte, og gi jobbsøkeren tid til å tenke.',
    );

    expect(written).toContain('Unngå å avbryte, og gi jobbsøkeren tid til å tenke.');
    expect(written).not.toContain('Gjør mer av: nr 0');
  });
});

describe('formatRatingsForObserver', () => {
  it('starts with the marker and lists good and bad ratings', () => {
    const text = formatRatingsForObserver([
      rating('good', 'Bra at du spør om erfaring.'),
      rating('bad', 'Ikke avbryt.'),
    ]);

    expect(text.startsWith(RATING_SUMMARY_MARKER)).toBe(true);
    expect(text).toContain('Bra:');
    expect(text).toContain('Dårlig:');
    expect(text).toContain('Kommentar: Bra at du spør om erfaring.');
    expect(text).toContain('Kommentar: Ikke avbryt.');
  });
});

describe('parseObserverRatingSummary', () => {
  it('keeps a prose summary and rejects a job-seeker feedback reply', () => {
    expect(parseObserverRatingSummary('  Still ett spørsmål om gangen.  ')).toBe(
      'Still ett spørsmål om gangen.',
    );
    expect(
      parseObserverRatingSummary(
        'Bra: fem år i butikk | Du viste erfaring. | Gi et konkret eksempel.',
      ),
    ).toBeNull();
    expect(parseObserverRatingSummary('   ')).toBeNull();
  });
});
