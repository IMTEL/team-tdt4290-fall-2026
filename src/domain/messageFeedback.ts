// A counsellor's rating of one agent reply in the test chat. RAGdoll stores it and adds the most
// recent ratings to the agent's prompt on every chat turn, so a rating shapes the next reply.

export type Rating = 'good' | 'bad';

/** A rating as the browser sees it. */
export type MessageFeedback = {
  id: string;
  rating: Rating;
  agentMessage: string;
  userMessage: string;
  comment: string;
  createdAt: string;
};

/** What the browser sends to rate a reply. */
export type NewMessageFeedback = Pick<
  MessageFeedback,
  'rating' | 'agentMessage' | 'userMessage' | 'comment'
>;

/** The longest each text may be. The same limits as RAGdoll; the server checks them too. */
export const FEEDBACK_LIMITS = {
  agentMessage: 4000,
  userMessage: 4000,
  comment: 500,
} as const;

export function isRating(value: unknown): value is Rating {
  return value === 'good' || value === 'bad';
}
