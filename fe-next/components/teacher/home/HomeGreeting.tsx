import { EduMascot } from '@/components/education/EduMascot';

/** Teacher Home's greeting: one line straight on the page; the small mascot only when no class desk carries it. */
export function HomeGreeting({ greeting, mascot = true }: { greeting: string; mascot?: boolean }) {
  return (
    <header data-testid="home-greeting-row" className="flex min-w-0 items-center gap-3">
      {mascot ? (
        <span data-testid="home-greeting-mascot" className="contents">
          <EduMascot moment="welcome" size={56} className="size-12 shrink-0 drop-shadow-[3px_3px_0_rgb(var(--neo-black))] sm:size-14" />
        </span>
      ) : null}
      <h1 suppressHydrationWarning className="min-w-0 font-neo-display text-2xl font-black leading-tight text-edu-ink sm:text-4xl">
        {greeting}
      </h1>
    </header>
  );
}
