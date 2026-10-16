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
      className="shrink-0 max-lg:mt-auto flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-12 md:px-16 lg:justify-start lg:ps-1 lg:pe-20"
    >
      {title && <h2 className="font-neo-display font-black uppercase tracking-widest leading-none text-neo-yellow text-xl md:text-3xl 2xl:text-4xl min-[2200px]:text-6xl [text-shadow:3px_3px_0_#000]">
        {title}
      </h2>}
      {lesson && (
        <p
          dir="auto"
          className="inline-flex min-w-0 max-w-full items-center gap-2 rounded-neo border-[2px] border-neo-cream/60 bg-neo-navy-elevated px-3 py-1 font-neo-body font-bold text-neo-cream text-sm md:text-lg min-[2200px]:text-3xl"
        >
          <BookOpen className="size-4 shrink-0 text-neo-cyan md:size-5" aria-hidden="true" />
          <span className="truncate">{lesson}</span>
        </p>
      )}
    </header>
  );
}

export default TvRecapHeader;
