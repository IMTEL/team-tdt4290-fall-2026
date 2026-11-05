import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { extractPromptText } from '@/domain/promptSource';

/** The observer agent's prompt, as pasted into RAGdoll from `prompts/observer.nb.md`. */
export function loadObserverPrompt(): string {
  const markdown = readFileSync(join(process.cwd(), 'prompts/observer.nb.md'), 'utf8');
  return extractPromptText(markdown);
}
