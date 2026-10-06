'use client';

import { useCallback, useMemo, useState } from 'react';

import { AgentChat } from '@/components/chat/AgentChat';
import type { ChatMessage, SendMessages } from '@/components/chat/types';
import type { InterviewerTemplate } from '@/data/interviewer-templates';
import type { Configuration } from '@/domain/configuration';
import { sendConfigurationTurn } from './api';
import { SaveAgentForm } from './SaveAgentForm';

// The assistant opens the conversation. Fixed text, so it costs no LLM call. It is also sent to
// RAGdoll as the first turn, so the agent doesn't greet again, and knows which template was chosen.
function greeting(template: InterviewerTemplate): ChatMessage {
  return {
    id: 'greeting',
    role: 'assistant',
    content:
      `Hei! Jeg hjelper deg med å sette opp en AI-intervjuer. Du har valgt malen ` +
      `«${template.title}». Hvilken stilling skal jobbsøkeren øve til?`,
  };
}

// A client component because page.tsx (a server component) can't pass a function to AgentChat.
export function ConfigurationChat({ template }: { template: InterviewerTemplate }) {
  // The finished configuration, once the configurator has written its KONFIGURASJON block.
  // Lives only in this browser tab: nothing is stored until the counsellor saves.
  const [configuration, setConfiguration] = useState<Configuration | null>(null);

  const initialMessages = useMemo(() => [greeting(template)], [template]);

  // useCallback keeps it the same function on every render.
  const askConfigurator = useCallback<SendMessages>(
    async (messages, signal) => {
      const result = await sendConfigurationTurn(template.id, messages, signal);
      // A reply without a block leaves the last finished configuration as it was.
      if (result.configuration) setConfiguration(result.configuration);
      return result.reply;
    },
    [template.id],
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
