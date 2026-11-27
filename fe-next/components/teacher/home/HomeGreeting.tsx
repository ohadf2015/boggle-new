import { EduMascot } from '@/components/education/EduMascot';

/** Teacher Home's greeting: a small mascot and one line, straight on the backdrop. */
export function HomeGreeting({ greeting }: { greeting: string }) {
  return (
    <header data-testid="home-greeting-row" className="flex min-w-0 items-center gap-3">
      <EduMascot moment="welcome" size={56} className="size-12 shrink-0 drop-shadow-[3px_3px_0_rgb(var(--neo-black))] sm:size-14" />
      <h1 suppressHydrationWarning className="min-w-0 font-neo-display text-xl font-black leading-tight text-neo-cream sm:text-2xl">
        {greeting}
      </h1>
    </header>
  );
}
