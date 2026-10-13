'use client';

import { useCallback, useMemo, useState } from 'react';

import { AgentChat } from '@/components/chat/AgentChat';
import type { ChatMessage, SendMessages } from '@/components/chat/types';
import type { InterviewerTemplate } from '@/data/interviewer-templates';
import type { AnswerSources } from '@/domain/agentTypes/types';
import type { Configuration } from '@/domain/configuration';
import type { JobSeekerProfile } from '@/domain/jobSeekerProfile';
import { sendConfigurationTurn } from './api';
import { SaveAgentForm } from './SaveAgentForm';

// The assistant opens the conversation. Fixed text, so it costs no LLM call. It is also sent to
// RAGdoll as the first turn, so the agent doesn't greet again, and knows what was chosen: a
// template decides the interviewer, and a profile decides the job seeker.
function greeting(
  template: InterviewerTemplate | null,
  profile: JobSeekerProfile | null,
): ChatMessage {
  const chosen = [
    template && ` Du har valgt malen «${template.title}».`,
    profile && ` Du har valgt jobbsøkerprofilen «${profile.label}».`,
  ]
    .filter(Boolean)
    .join('');
  return {
    id: 'greeting',
    role: 'assistant',
    content: `Hei! Jeg hjelper deg med å sette opp en AI-intervjuer.${chosen} Hvilken stilling skal jobbsøkeren øve til?`,
  };
}

// A client component because page.tsx (a server component) can't pass a function to AgentChat.
type ConfigurationChatProps = {
  /** Null when the counsellor started without a template. */
  template: InterviewerTemplate | null;
  /** Null when the counsellor chose no job seeker profile. */
  profile: JobSeekerProfile | null;
};

export function ConfigurationChat({ template, profile }: ConfigurationChatProps) {
  // The finished configuration, once the configurator has written its KONFIGURASJON block.
  // Lives only in this browser tab: nothing is stored until the counsellor saves.
  const [configuration, setConfiguration] = useState<Configuration | null>(null);

  const templateId = template?.id ?? null;
  const profileId = profile?.id ?? null;
  const initialMessages = useMemo(() => [greeting(template, profile)], [template, profile]);
  // The chat puts the template's and profile's text in these answers unchanged, so they are
  // where the answers came from.
  const sources = useMemo<AnswerSources>(
    () => ({
      ...(templateId && { intervjuer: { kind: 'template', id: templateId } }),
      ...(profileId && { jobbsoker: { kind: 'profile', id: profileId } }),
    }),
    [templateId, profileId],
  );

  // useCallback keeps it the same function on every render.
  const askConfigurator = useCallback<SendMessages>(
    async (messages, signal) => {
      const result = await sendConfigurationTurn({ templateId, profileId }, messages, signal);
      // A reply without a block leaves the last finished configuration as it was.
      if (result.configuration) setConfiguration(result.configuration);
      return result.reply;
    },
    [templateId, profileId],
  );

  return (
    <>
      <AgentChat send={askConfigurator} initialMessages={initialMessages} />
      {/* A new key when the configuration changes resets the form, so a changed
          configuration can be saved again. */}
      {configuration && (
        <SaveAgentForm
          key={JSON.stringify(configuration)}
          configuration={configuration}
          sources={sources}
        />
      )}
    </>
  );
}
