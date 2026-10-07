'use client';

import { useCallback, useMemo, useState } from 'react';

import { AgentChat } from '@/components/chat/AgentChat';
import type { ChatMessage, SendMessages } from '@/components/chat/types';
import type { InterviewerTemplate } from '@/data/interviewer-templates';
import type { Configuration } from '@/domain/configuration';
import { sendConfigurationTurn } from './api';
import { SaveAgentForm } from './SaveAgentForm';

// The assistant opens the conversation. Fixed text, so it costs no LLM call. It is also sent to
// RAGdoll as the first turn, so the agent doesn't greet again, and knows if a template was chosen.
function greeting(template: InterviewerTemplate | null): ChatMessage {
  const chosen = template ? ` Du har valgt malen «${template.title}».` : '';
  return {
    id: 'greeting',
    role: 'assistant',
    content: `Hei! Jeg hjelper deg med å sette opp en AI-intervjuer.${chosen} Hvilken stilling skal jobbsøkeren øve til?`,
  };
}

// A client component because page.tsx (a server component) can't pass a function to AgentChat.
/** `template` is null when the counsellor started without one. */
export function ConfigurationChat({ template }: { template: InterviewerTemplate | null }) {
  // The finished configuration, once the configurator has written its KONFIGURASJON block.
  // Lives only in this browser tab: nothing is stored until the counsellor saves.
  const [configuration, setConfiguration] = useState<Configuration | null>(null);

  const templateId = template?.id ?? null;
  const initialMessages = useMemo(() => [greeting(template)], [template]);

  // useCallback keeps it the same function on every render.
  const askConfigurator = useCallback<SendMessages>(
    async (messages, signal) => {
      const result = await sendConfigurationTurn(templateId, messages, signal);
      // A reply without a block leaves the last finished configuration as it was.
      if (result.configuration) setConfiguration(result.configuration);
      return result.reply;
    },
    [templateId],
  );

  return (
    <>
      <AgentChat send={askConfigurator} initialMessages={initialMessages} />
      {/* A new key when the configuration changes resets the form, so a changed
          configuration can be saved again. */}
      {configuration && (
        <SaveAgentForm key={JSON.stringify(configuration)} configuration={configuration} />
      )}
    </>
  );
}
