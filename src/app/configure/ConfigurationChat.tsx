'use client';

import { useCallback, useMemo, useState } from 'react';
import Button from '@mui/material/Button';

import { AgentChat } from '@/components/chat/AgentChat';
import type { ChatMessage, SendMessages } from '@/components/chat/types';
import type { InterviewerTemplate } from '@/data/interviewer-templates';
import type { AnswerSources } from '@/domain/agentTypes/types';
import type { Configuration } from '@/domain/configuration';
import type { JobSeekerProfile } from '@/domain/jobSeekerProfile';
import { sendConfigurationTurn } from './api';
import { ConfirmConfiguration } from './ConfirmConfiguration';

// Shown in the chat instead of the KONFIGURASJON block, which the pop-up shows in a readable way.
export const FINISHED_REPLY =
  'Takk! Nå har jeg det jeg trenger. Se gjennom oppsummeringen og lagre intervjueren.';

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
  // The finished configuration and its sources, once the configurator has written its
  // KONFIGURASJON block. Lives only in this browser tab: nothing is stored until the counsellor
  // saves.
  const [finished, setFinished] = useState<{
    configuration: Configuration;
    sources: AnswerSources;
  } | null>(null);
  // Whether the pop-up with the finished configuration is open.
  const [open, setOpen] = useState(false);

  const templateId = template?.id ?? null;
  const profileId = profile?.id ?? null;
  const initialMessages = useMemo(() => [greeting(template, profile)], [template, profile]);

  // useCallback keeps it the same function on every render.
  const askConfigurator = useCallback<SendMessages>(
    async (messages, signal) => {
      const result = await sendConfigurationTurn({ templateId, profileId }, messages, signal);
      // A reply without a block leaves the last finished configuration as it was.
      if (!result.configuration) return result.reply;

      setFinished({ configuration: result.configuration, sources: result.sources });
      setOpen(true);
      return FINISHED_REPLY;
    },
    [templateId, profileId],
  );

  return (
    <>
      <AgentChat send={askConfigurator} initialMessages={initialMessages} />
      {/* A new key when the configuration changes resets the form, so a changed
          configuration can be saved again. */}
      {finished && (
        <>
          <Button variant="contained" onClick={() => setOpen(true)} sx={{ mt: 2 }}>
            Se oppsummeringen
          </Button>
          <ConfirmConfiguration
            key={JSON.stringify(finished.configuration)}
            configuration={finished.configuration}
            sources={finished.sources}
            open={open}
            onClose={() => setOpen(false)}
          />
        </>
      )}
    </>
  );
}
