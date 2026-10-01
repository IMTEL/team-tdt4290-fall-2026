'use client';

import { AgentChat } from '@/components/chat/AgentChat';
import { sendToAgent } from '@/components/chat/sendToAgent';
import type { ChatMessage, SendMessages } from '@/components/chat/types';
import type { InterviewerTemplate } from '@/data/interviewer-templates';

const askAboutJob = 'Hvilken stilling skal jobbsøkeren øve til?';

// The assistant opens the conversation. Fixed text, so it costs no LLM call. It is also sent to
// RAGdoll as the first turn, so the agent doesn't greet again.
const greeting: ChatMessage = {
  id: 'greeting',
  role: 'assistant',
  content: `Hei! Jeg hjelper deg med å sette opp en AI-intervjuer. ${askAboutJob}`,
};

// With a template, the counsellor's choice and the assistant's answer are fixed turns too, so the
// configurator gets the template's persona as context without an extra LLM call.
function initialMessagesFor(template: InterviewerTemplate | null): ChatMessage[] {
  if (!template) return [greeting];
  return [
    { ...greeting, content: 'Hei! Jeg hjelper deg med å sette opp en AI-intervjuer.' },
    {
      id: 'template',
      role: 'user',
      content: `Jeg vil ta utgangspunkt i malen «${template.title}». ${template.persona}`,
    },
    {
      id: 'template-ack',
      role: 'assistant',
      content: `Flott, da tar vi utgangspunkt i en ${template.title.toLowerCase()}. ${askAboutJob}`,
    },
  ];
}

// Outside the component, so it is the same function on every render.
const askConfigurator: SendMessages = (messages, signal) =>
  sendToAgent('configurator', messages, signal);

type ConfigurationChatProps = {
  /** The template the counsellor started from, if any. */
  template?: InterviewerTemplate | null;
};

// A client component because page.tsx (a server component) can't pass a function to AgentChat.
export function ConfigurationChat({ template = null }: ConfigurationChatProps) {
  return <AgentChat send={askConfigurator} initialMessages={initialMessagesFor(template)} />;
}
