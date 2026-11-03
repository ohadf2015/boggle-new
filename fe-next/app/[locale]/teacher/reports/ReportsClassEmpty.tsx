'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Play } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

/** A class nobody has played in yet: say what will appear here and give the one way to fill it. */
export function ReportsClassEmpty({ classroomId }: { classroomId: string }) {
  const { t, language } = useLanguage();
  return (
    <section
      data-testid="reports-class-empty"
      aria-labelledby="reports-class-empty-title"
      className="flex flex-col items-center gap-4 rounded-neo border-2 border-dashed border-neo-cream/40 bg-neo-navy-light px-5 py-8 text-center sm:flex-row sm:text-start"
    >
      <Image src="/mascot/edu/edu-empty-512.webp" alt="" width={112} height={112} className="size-24 shrink-0 sm:size-28" />
      <div className="flex min-w-0 flex-col items-center gap-3 sm:items-start">
        <h2 id="reports-class-empty-title" className="font-neo-display text-xl font-black leading-tight text-neo-cream">
          {t('teacher.reports.emptyClass.title', 'No games in this class yet')}
        </h2>
        <p className="max-w-prose text-base leading-snug text-neo-cream">
          {t(
            'teacher.reports.emptyClass.body',
            'Play one game with this class. Its report then shows which words the class missed and who needs help.'
          )}
        </p>
        <Link
          href={`/${language}/education/classroom-game?classroomId=${encodeURIComponent(classroomId)}`}
          className="inline-flex min-h-11 items-center gap-2 rounded-neo border-[3px] border-neo-black bg-neo-lime px-5 font-neo-display text-base font-black text-neo-black shadow-hard transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-hard-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy active:translate-y-0.5 active:shadow-none motion-reduce:transition-none"
        >
          <Play className="size-4 shrink-0" aria-hidden="true" />
          {t('teacher.reports.emptyClass.cta', 'Start a game with this class')}
        </Link>
      </div>
    </section>
  );
}

export default ReportsClassEmpty;
