export type Sector = 'offentlig' | 'privat';

export const SECTOR_LABELS: Record<Sector, string> = {
  offentlig: 'Offentlig',
  privat: 'Privat',
};

export interface JobTemplate {
  id: string;
  /** The job, shown on the card. Written as a general job title. */
  title: string;
  /** The industry the job is in, shown on the card. */
  industry: string;
  /** Whether the employer is public or private. */
  sector: Sector;
  /** One line for the counsellor about what the job is like. */
  description: string;
  /** Typical tasks in the job, shown as tags on the card. */
  tasks: string[];
  /** A general job description. Becomes part of the Stilling field of the configuration. */
  jobDescription: string;
}

export const builtInJobTemplates: JobTemplate[] = [
  {
    id: 'helsefagarbeider',
    title: 'Helsefagarbeider',
    industry: 'Helse og omsorg',
    sector: 'offentlig',
    description: 'Pleie og omsorg på sykehjem eller i hjemmetjenesten i kommunen.',
    tasks: ['Pleie', 'Omsorg', 'Turnus'],
    jobDescription:
      'Helsefagarbeider på sykehjem eller i hjemmetjenesten i kommunen. Hjelper beboere og ' +
      'brukere med stell, måltider og medisiner, observerer og rapporterer endringer, og ' +
      'samarbeider med sykepleiere og annet helsepersonell. Jobben går i turnus med dag-, ' +
      'kvelds- og helgevakter.',
  },
  {
    id: 'barnehageassistent',
    title: 'Barnehageassistent',
    industry: 'Oppvekst og utdanning',
    sector: 'offentlig',
    description: 'Jobber med barn i en kommunal barnehage, i et team med pedagoger.',
    tasks: ['Barn', 'Samarbeid', 'Foreldrekontakt'],
    jobDescription:
      'Barnehageassistent i en kommunal barnehage. Leker og er sammen med barna, hjelper til ' +
      'med måltider, påkledning og hvile, følger opp planer fra pedagogisk leder og har daglig ' +
      'kontakt med foreldre ved levering og henting.',
  },
  {
    id: 'kontormedarbeider-kommune',
    title: 'Kontormedarbeider',
    industry: 'Offentlig forvaltning',
    sector: 'offentlig',
    description: 'Kontor- og publikumsarbeid i en kommune eller etat.',
    tasks: ['Saksbehandling', 'Publikum', 'Arkiv'],
    jobDescription:
      'Kontormedarbeider i en kommune eller offentlig etat. Tar imot henvendelser fra ' +
      'innbyggere på telefon, e-post og i skranke, registrerer og arkiverer saker, og hjelper ' +
      'saksbehandlere med enkle oppgaver. Jobben krever nøyaktighet og at man følger regler for ' +
      'taushetsplikt.',
  },
  {
    id: 'butikkmedarbeider',
    title: 'Butikkmedarbeider',
    industry: 'Varehandel',
    sector: 'privat',
    description: 'Kundeservice, kasse og varepåfylling i en dagligvare- eller klesbutikk.',
    tasks: ['Kundeservice', 'Kasse', 'Varepåfylling'],
    jobDescription:
      'Butikkmedarbeider i en dagligvare- eller faghandel. Hjelper kunder, sitter i kassen, ' +
      'fyller på varer og holder butikken ryddig. Jobben går ofte på kveld og i helger, og man ' +
      'må trives med å ha mye kontakt med mennesker.',
  },
  {
    id: 'lagermedarbeider',
    title: 'Lagermedarbeider',
    industry: 'Transport og logistikk',
    sector: 'privat',
    description: 'Plukk, pakking og varemottak på et lager eller en terminal.',
    tasks: ['Plukk og pakk', 'Truck', 'Sikkerhet'],
    jobDescription:
      'Lagermedarbeider på et lager eller en terminal. Tar imot varer, plukker og pakker ' +
      'ordre, kjører truck og holder orden på lageret. Jobben er fysisk, går ofte i skift, og ' +
      'krever at man følger sikkerhetsrutiner og jobber effektivt.',
  },
  {
    id: 'servitor',
    title: 'Servitør',
    industry: 'Hotell og restaurant',
    sector: 'privat',
    description: 'Serverer gjester på en restaurant eller kafé. Tempo og service.',
    tasks: ['Service', 'Tempo', 'Samarbeid'],
    jobDescription:
      'Servitør på en restaurant, kafé eller et hotell. Tar imot gjester, tar bestillinger, ' +
      'serverer mat og drikke og tar betalt. Jobben har høyt tempo i travle perioder, går ofte ' +
      'på kveld og i helger, og krever godt samarbeid med kjøkkenet.',
  },
  {
    id: 'renholder',
    title: 'Renholder',
    industry: 'Renhold og eiendom',
    sector: 'privat',
    description: 'Renhold av kontorer, butikker eller skoler for et renholdsbyrå.',
    tasks: ['Renhold', 'Selvstendig', 'Rutiner'],
    jobDescription:
      'Renholder i et renholdsbyrå som gjør rent hos kunder som kontorer, butikker og skoler. ' +
      'Følger faste planer for renhold, bruker maskiner og rengjøringsmidler riktig, og jobber ' +
      'ofte alene tidlig om morgenen eller på kveld.',
  },
  {
    id: 'bygningsarbeider',
    title: 'Bygningsarbeider',
    industry: 'Bygg og anlegg',
    sector: 'privat',
    description: 'Praktisk arbeid på byggeplass i et lag med fagarbeidere.',
    tasks: ['Praktisk arbeid', 'HMS', 'Lagarbeid'],
    jobDescription:
      'Bygningsarbeider i et byggfirma. Hjelper fagarbeidere på byggeplassen med å bære og ' +
      'montere materialer, rydde og forberede arbeid. Jobben er fysisk og utendørs, og krever ' +
      'at man følger regler for helse, miljø og sikkerhet (HMS).',
  },
];

export function findJobTemplate(id: string): JobTemplate | undefined {
  return builtInJobTemplates.find((template) => template.id === id);
}
