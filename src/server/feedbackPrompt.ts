import {
  formatRatingsForObserver,
  MAX_DETAILED_RATINGS,
  MAX_FEEDBACK_TO_READ,
  parseObserverRatingSummary,
  withFeedbackSection,
} from '@/domain/interviewerFeedbackPrompt';
import type { MessageFeedback } from '@/domain/messageFeedback';
import { fromRagdollFeedback } from './feedbackMapper';
import { askAgent, fetchFullAgent, listFeedback, updateAgent } from './ragdoll';

/**
 * Writes the agent's ratings into its stored system prompt: a summary of all of them, plus the
 * newest quoted in full. When there are many, the observer writes the summary. Removes the block
 * when there are none left. Called after a rating is saved or undone, and after the agent is
 * edited, so the next reply follows the ratings.
 */
export async function syncAgentPromptWithFeedback(
  sessionToken: string,
  agentId: string,
): Promise<void> {
  const [agent, ratings] = await Promise.all([
    fetchFullAgent(sessionToken, agentId),
    listFeedback(sessionToken, agentId, MAX_FEEDBACK_TO_READ),
  ]);
  const prompt = await promptWithRatings(agent.prompt, ratings.map(fromRagdollFeedback));
  if (prompt === agent.prompt) return;
  await updateAgent(sessionToken, { ...agent, prompt, last_updated: new Date().toISOString() });
}

/**
 * The stored prompt with the ratings block. Asks the observer to summarise when there are many
 * ratings; falls back to counting comments if the observer is missing or the reply is unusable.
 */
export async function promptWithRatings(
  prompt: string,
  ratings: MessageFeedback[],
): Promise<string> {
  const observerSummary =
    ratings.length > MAX_DETAILED_RATINGS ? await askObserverForRatingSummary(ratings) : null;
  return withFeedbackSection(prompt, ratings, undefined, observerSummary);
}

async function askObserverForRatingSummary(ratings: MessageFeedback[]): Promise<string | null> {
  const id = process.env.RAGDOLL_OBSERVER_AGENT_ID;
  const accessKey = process.env.RAGDOLL_OBSERVER_ACCESS_KEY;
  if (!id || !accessKey) return null;
  try {
    const reply = await askAgent({ id, accessKey }, [
      { role: 'user', content: formatRatingsForObserver(ratings) },
    ]);
    return parseObserverRatingSummary(reply);
  } catch (error) {
    console.error('Could not get a rating summary from the observer:', error);
    return null;
  }
}
