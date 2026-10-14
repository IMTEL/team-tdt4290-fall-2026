'use client';

import { useCallback, useMemo, useState } from 'react';

import { AgentChat } from '@/components/chat/AgentChat';
import type { ChatMessage, SendMessages } from '@/components/chat/types';
import { SECTOR_LABELS, type IndustryTemplate } from '@/data/industry-templates';
import type { InterviewerTemplate } from '@/data/interviewer-templates';
import { decidedFields, firstQuestion } from '@/domain/agentTypes/configurator';
import type { AgentTypeDefinition, AnswerSources, Answers } from '@/domain/agentTypes/types';
import type { JobSeekerProfile } from '@/domain/jobSeekerProfile';
import { sendConfigurationTurn } from './api';
import { SaveAgentForm } from './SaveAgentForm';

// The assistant opens the conversation. Fixed text, so it costs no LLM call. It is also sent to
// RAGdoll, after the server's briefing, so the agent doesn't greet again, and knows what was
// chosen. It asks the type's first question that a template or profile hasn't answered: with an
// industry template, the job is already known, so an interviewer's chat asks about the company.
function greeting(
  definition: AgentTypeDefinition,
  template: InterviewerTemplate | null,
  profile: JobSeekerProfile | null,
  industry: IndustryTemplate | null,
): ChatMessage {
  const decided = decidedFields(definition, {
    interviewerTemplate: template !== null,
    jobSeekerProfile: profile !== null,
    industryTemplate: industry !== null,
  });
  const chosen = [
    template && ` Du har valgt malen «${template.title}».`,
    industry &&
      ` Du har valgt bransjemalen «${industry.title}» (${industry.industry}, ` +
        `${SECTOR_LABELS[industry.sector].toLowerCase()} sektor).`,
    profile && ` Du har valgt jobbsøkerprofilen «${profile.label}».`,
  ]
    .filter(Boolean)
    .join('');
  return {
    id: 'greeting',
    role: 'assistant',
    content: `${definition.configurator.greeting}${chosen} ${firstQuestion(definition, decided)}`,
  };
}

// A client component because page.tsx (a server component) can't pass a function to AgentChat.
type ConfigurationChatProps = {
  /** The type of agent being set up. */
  definition: AgentTypeDefinition;
  /** Null when the counsellor started without a template. */
  template: InterviewerTemplate | null;
  /** Null when the counsellor chose no job seeker profile. */
  profile: JobSeekerProfile | null;
  /** The industry template, or null when the counsellor started without one. */
  industry?: IndustryTemplate | null;
};

export function ConfigurationChat({
  definition,
  template,
  profile,
  industry = null,
}: ConfigurationChatProps) {
  // The finished configuration and its sources, once the configurator has written its
  // KONFIGURASJON block. Lives only in this browser tab: nothing is stored until the counsellor
  // saves.
  const [finished, setFinished] = useState<{
    configuration: Answers;
    sources: AnswerSources;
  } | null>(null);

  const templateId = template?.id ?? null;
  const profileId = profile?.id ?? null;
  const industryTemplateId = industry?.id ?? null;
  const initialMessages = useMemo(
    () => [greeting(definition, template, profile, industry)],
    [definition, template, profile, industry],
  );

  // useCallback keeps it the same function on every render.
  const askConfigurator = useCallback<SendMessages>(
    async (messages, signal) => {
      const result = await sendConfigurationTurn(
        definition,
        { templateId, profileId, industryTemplateId },
        messages,
        signal,
      );
      // A reply without a block leaves the last finished configuration as it was.
      if (result.configuration) {
        setFinished({ configuration: result.configuration, sources: result.sources });
      }
      return result.reply;
    },
    [definition, templateId, profileId, industryTemplateId],
  );

  return (
    <>
      <AgentChat send={askConfigurator} initialMessages={initialMessages} />
      {/* A new key when the configuration changes resets the form, so a changed
          configuration can be saved again. */}
      {finished && (
        <SaveAgentForm
          definition={definition}
          key={JSON.stringify(finished.configuration)}
          configuration={finished.configuration}
          sources={finished.sources}
        />
      )}
    </>
  );
}
