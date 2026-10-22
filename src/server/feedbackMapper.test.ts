import { describe, expect, it } from 'vitest';

import { fromRagdollFeedback, parseNewFeedback, toRagdollFeedback } from './feedbackMapper';

const feedback = {
  rating: 'bad',
  agentMessage: 'Hvorfor søker du denne stillingen?',
  userMessage: 'Hei, jeg heter Kari.',
  comment: 'Spør om erfaring først.',
};

describe('parseNewFeedback', () => {
  it('trims the texts and keeps only the fields we store', () => {
    expect(
      parseNewFeedback({
        ...feedback,
        comment: '  Spør om erfaring først. ',
        authorId: 'someone-else',
        agentId: 'another-agent',
      }),
    ).toEqual(feedback);
  });

  it('fills in the user message and the comment when they are left out', () => {
    expect(parseNewFeedback({ rating: 'good', agentMessage: 'Hei!' })).toEqual({
      rating: 'good',
      agentMessage: 'Hei!',
      userMessage: '',
      comment: '',
    });
  });

  it('rejects a missing or unknown rating and a missing or blank reply', () => {
    expect(parseNewFeedback({ ...feedback, rating: undefined })).toBeNull();
    expect(parseNewFeedback({ ...feedback, rating: 'ok' })).toBeNull();
    expect(parseNewFeedback({ ...feedback, agentMessage: undefined })).toBeNull();
    expect(parseNewFeedback({ ...feedback, agentMessage: '   ' })).toBeNull();
    expect(parseNewFeedback(null)).toBeNull();
  });

  it('rejects texts longer than RAGdoll accepts', () => {
    expect(parseNewFeedback({ ...feedback, agentMessage: 'a'.repeat(4001) })).toBeNull();
    expect(parseNewFeedback({ ...feedback, userMessage: 'a'.repeat(4001) })).toBeNull();
    expect(parseNewFeedback({ ...feedback, comment: 'a'.repeat(501) })).toBeNull();
    expect(parseNewFeedback({ ...feedback, comment: 'a'.repeat(500) })).not.toBeNull();
  });
});

describe('toRagdollFeedback and fromRagdollFeedback', () => {
  it('translate between our field names and RAGdoll’s', () => {
    const parsed = parseNewFeedback(feedback)!;
    const ragdoll = toRagdollFeedback(parsed);
    expect(ragdoll).toEqual({
      rating: 'bad',
      agent_message: feedback.agentMessage,
      user_message: feedback.userMessage,
      comment: feedback.comment,
    });

    expect(
      fromRagdollFeedback({
        ...ragdoll,
        id: 'feedback-1',
        agent_id: 'agent-1',
        created_at: '2026-10-21T10:00:00',
      }),
    ).toEqual({ ...feedback, id: 'feedback-1', createdAt: '2026-10-21T10:00:00' });
  });
});
