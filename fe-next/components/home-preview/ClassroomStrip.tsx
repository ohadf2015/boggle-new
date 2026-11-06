'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, GraduationCap } from 'lucide-react';

/** Full-bleed lime band: the one place the page talks to teachers. */
export function ClassroomStrip({ lang, t }: { lang: string; t: (key: string) => string }) {
  return (
    <section
      aria-labelledby="hp-class-title"
      className="relative overflow-hidden border-y-[3px] border-black bg-neo-lime text-black"
      data-testid="hp-classroom"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-15 [background-image:repeating-linear-gradient(-45deg,black_0_2px,transparent_2px_14px)]"
      />
      <div className="relative mx-auto flex w-full max-w-md items-center gap-3 px-4 py-5 lg:max-w-[1600px] lg:gap-10 lg:px-14 lg:py-10">
        <Image
          src="/mascot/edu/edu-firstClass-512.webp"
          alt=""
          width={512}
          height={512}
          className="h-24 w-24 shrink-0 -rotate-3 lg:h-44 lg:w-44"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-2 lg:flex-row lg:items-center lg:gap-10">
          <div className="min-w-0 flex-1">
            <p className="inline-flex items-center gap-1.5 rounded-md border-2 border-black bg-neo-navy px-2 py-0.5 font-neo-display text-[11px] font-bold tracking-widest text-neo-lime uppercase lg:text-sm">
              <GraduationCap className="h-3.5 w-3.5 lg:h-4 lg:w-4" strokeWidth={2.75} aria-hidden="true" />
              {t('footer.forTeachers')}
            </p>
            <h2 id="hp-class-title" className="mt-1.5 font-neo-display text-lg font-bold leading-tight lg:text-4xl">
              {t('homeFresh.sections.classrooms.title')}
            </h2>
            <p className="mt-1 hidden text-lg font-medium lg:block">{t('homeFresh.sections.classrooms.line')}</p>
          </div>
          <Link
            href={`/${lang}/education`}
            className="inline-flex items-center gap-2 self-start rounded-xl border-[3px] border-black bg-neo-navy px-3 py-2 font-neo-display text-sm font-bold whitespace-nowrap text-neo-lime shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-pressed lg:self-center lg:px-6 lg:py-4 lg:text-xl"
          >
            {t('homeFresh.sections.classrooms.cta')}
            <ArrowRight className="h-4 w-4 rtl:-scale-x-100 lg:h-6 lg:w-6" strokeWidth={3} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
