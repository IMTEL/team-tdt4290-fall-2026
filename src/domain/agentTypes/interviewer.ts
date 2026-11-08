import { LABELS, type Configuration } from '../configuration';
import { explainInterviewer } from '../interviewerAdaptations';
import { buildPrompt } from '../interviewerPrompt';
import { buildInterviewerSummary } from '../interviewerSummary';
import type { AgentTypeDefinition } from './types';

/** An interviewer for a practice job interview in The Candidate. */
export const interviewer: AgentTypeDefinition = {
  id: 'interviewer',
  label: 'Intervjuer',
  description:
    'Et øvingsintervju for en jobb, der jobbsøkeren svarer på spørsmål fra en intervjuer.',
  // In the order of LABELS, which is the order the details page shows them in.
  fields: [
    { key: 'stilling', label: LABELS.stilling },
    { key: 'bransje', label: LABELS.bransje },
    { key: 'bedrift', label: LABELS.bedrift },
    { key: 'intervjutype', label: LABELS.intervjutype },
    { key: 'intervjuer', label: LABELS.intervjuer },
    { key: 'jobbsoker', label: LABELS.jobbsoker },
    { key: 'vanskelighetsgrad', label: LABELS.vanskelighetsgrad },
    { key: 'egneSporsmal', label: LABELS.egneSporsmal },
    { key: 'tillegg', label: LABELS.tillegg, optional: true },
    // Filled in from the chosen legal templates only.
    { key: 'lovverk', label: LABELS.lovverk, optional: true },
  ],
  presets: {
    template: {
      field: 'intervjuer',
      text: {
        titleHint: 'Hvem er intervjueren? For eksempel «Butikksjef».',
        descriptionHint: 'Én setning om hvordan intervjueren er. Vises på kortet.',
        textLabel: 'Beskrivelse av intervjueren',
        textHint:
          'Hvem intervjueren er, hvordan hen oppfører seg og hva hen spør om. Intervjueren får ' +
          'denne teksten.',
        pickerLead:
          'Malen bestemmer hvem som intervjuer jobbsøkeren. Uten mal er intervjueren nøytral og ' +
          'profesjonell.',
      },
    },
    jobSeekerProfile: 'jobbsoker',
    legalTemplates: 'lovverk',
  },
  // Safe cast: answers are checked with hasAllAnswers before a prompt is built.
  buildPrompt: (answers) => buildPrompt(answers as Configuration),
  buildSummary: buildInterviewerSummary,
  // Safe cast: stored answers and the wizard's answers have every field, empty when not given.
  explainAnswers: (answers) => explainInterviewer(answers as Configuration),
  // One role: The Candidate chats with a published agent as its first role.
  buildRoles: (name, answers) => [{ name, description: answers.intervjuer }],
  // Only the job title: an industry template puts a whole job description after it, which would
  // go past the name's length limit.
  defaultName: (answers) => `Intervjuer for ${answers.stilling.split('. ')[0]}`,
};
