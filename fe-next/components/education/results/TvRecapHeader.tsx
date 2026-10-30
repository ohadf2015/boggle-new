'use client';

import { BookOpen } from 'lucide-react';

export interface TvRecapHeaderProps {
  /** Absent when the boss card above already says what happened. */
  title: string | null;
  lessonNames: string[];
}

/** One line across the top of the wall: what this screen is, and which lesson it was. Start-aligned on the wall, centred on a phone. */
export function TvRecapHeader({ title, lessonNames }: TvRecapHeaderProps) {
  const lesson = lessonNames.filter(Boolean).join(' · ');
  return (
    <header
      data-testid="tv-recap-header"
      className="shrink-0 @max-[64rem]/results:mt-auto flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-1 @3xl/results:gap-x-4 @3xl/results:px-16 @5xl/results:justify-start @5xl/results:ps-1 @5xl/results:pe-20"
    >
      {title && <h2 className="font-neo-display font-bold leading-none text-neo-cream text-xl @3xl/results:text-3xl @[96rem]/results:text-4xl @[137.5rem]/results:text-6xl">
        {title}
      </h2>}
      {lesson && (
        <p
          dir="auto"
          className="inline-flex min-w-0 max-w-full items-center gap-2 rounded-neo border-[2px] border-neo-cream/60 bg-neo-navy-elevated px-3 py-1 font-neo-body font-bold text-neo-cream text-sm @3xl/results:text-lg @[137.5rem]/results:text-3xl"
        >
          <BookOpen className="size-4 shrink-0 text-neo-cream/80 @3xl/results:size-5" aria-hidden="true" />
          <span className="truncate">{lesson}</span>
        </p>
      )}
    </header>
  );
}

export default TvRecapHeader;
