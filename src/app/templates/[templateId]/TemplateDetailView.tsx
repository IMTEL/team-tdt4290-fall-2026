'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { notFound, useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';

import { fetchTemplate } from '@/components/templates/api';
import { DeleteTemplateButton } from '@/components/templates/DeleteTemplateButton';
import {
  BUILT_IN_LABEL,
  TemplateDetail,
  TemplateDetailPage,
  TemplateDetailSkeleton,
} from '@/components/templates/TemplateDetail';
import { findBuiltInTemplate, type AgentTemplate } from '@/data/templates';
import { getAgentType } from '@/domain/agentTypes/registry';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; template: AgentTemplate; builtIn: boolean }
  | { kind: 'missing' }
  | { kind: 'error'; message: string };

/**
 * One interviewer template, such as a stillingsmal the counsellor saved: what it is like, what it
 * focuses on and the description the interviewer gets. The counsellor's own templates have the
 * buttons to edit and delete them. The built-in ones come with the app and have none.
 */
export function TemplateDetailView({ templateId }: { templateId: string }) {
  const router = useRouter();
  const builtIn = findBuiltInTemplate(templateId);
  const [state, setState] = useState<LoadState>(
    builtIn ? { kind: 'ready', template: builtIn, builtIn: true } : { kind: 'loading' },
  );

  useEffect(() => {
    // A built-in template is already here; only the counsellor's own are in RAGdoll.
    if (builtIn) return;
    let cancelled = false;
    fetchTemplate(templateId)
      .then((template) => {
        if (cancelled) return;
        setState(template ? { kind: 'ready', template, builtIn: false } : { kind: 'missing' });
      })
      .catch((error: Error) => {
        if (!cancelled) setState({ kind: 'error', message: error.message });
      });
    return () => {
      cancelled = true;
    };
  }, [templateId, builtIn]);

  if (state.kind === 'missing') notFound();

  if (state.kind !== 'ready') {
    return (
      <TemplateDetailPage>
        {/* English translation: Loading template */}
        {state.kind === 'loading' && <TemplateDetailSkeleton label="Laster mal" />}
        {state.kind === 'error' && <Alert severity="error">{state.message}</Alert>}
      </TemplateDetailPage>
    );
  }

  const { template } = state;
  return (
    <TemplateDetail
      title={template.title}
      // English translation: Your own template
      chip={state.builtIn ? BUILT_IN_LABEL : 'Egen mal'}
      // English translation: About the template
      summary={{ label: 'Om malen', text: template.description }}
      actions={
        !state.builtIn && (
          <>
            <Button
              component={Link}
              href={`/templates/${encodeURIComponent(template.id)}/edit`}
              variant="outlined"
            >
              Rediger
            </Button>
            <DeleteTemplateButton
              template={template}
              variant="outlined"
              onDeleted={() => router.push('/templates')}
            />
          </>
        )
      }
      fields={[
        // English translation: Agent type
        {
          label: 'Type agent',
          text: getAgentType(template.agentType)?.label ?? template.agentType,
        },
        // English translation: Focus areas
        { label: 'Fokusområder', chips: template.focus },
        // English translation: Description of the interviewer
        { label: 'Beskrivelse av intervjueren', text: template.persona, boxed: true },
      ]}
    />
  );
}
