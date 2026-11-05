/**
 * The text inside the first ` ```text ` block of a prompt source file in `prompts/`. That block is
 * what is pasted into RAGdoll as the agent's General Agent Prompt.
 */
export function extractPromptText(markdown: string): string {
  const match = markdown.match(/```text\r?\n([\s\S]*?)\r?\n```/);
  return match ? match[1].trim() : '';
}
