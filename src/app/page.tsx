import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col items-center px-4 py-24 text-center sm:px-6">
      <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
        Interviewer Agent Configurator
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-pretty text-muted-foreground">
        Configure AI interviewer agents, try them out in a chat, and publish them to the VR app The
        Candidate.
      </p>

      <section className="mt-12 w-full max-w-md rounded-xl border bg-card p-6 text-left text-card-foreground shadow-sm">
        <h2 className="font-medium">Design tokens</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          These buttons read their colours from the theme, so they follow light and dark mode
          automatically.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button>Default</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="secondary">Secondary</Button>
        </div>
      </section>
    </div>
  );
}
