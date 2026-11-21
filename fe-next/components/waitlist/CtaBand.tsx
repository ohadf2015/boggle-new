import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { arabicText, type Typo } from './typography';

interface CtaBandProps {
  playNow: { text: string; label: string; href: string; waitlistLabel: string };
  sibling: { label: string; href: string; lang: string };
  typo: Typo;
}

export function CtaBand({ playNow, sibling, typo }: CtaBandProps) {
  return (
    <section className="relative mt-20 rounded-neo-lg border-neo-thick border-neo-black bg-neo-lime p-6 text-neo-black shadow-hard-xl sm:mt-24 sm:p-10">
      <p className={cn('max-w-2xl text-2xl leading-snug sm:text-3xl', typo.display)}>{playNow.text}</p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <Link
          href={playNow.href}
          className={cn(
            'group inline-flex min-h-12 items-center justify-center gap-2 rounded-neo border-neo-thick border-neo-black bg-neo-pink px-7 py-3 text-lg text-neo-black shadow-hard-lg transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0.5 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-neo-navy',
            typo.display,
            typo.caps
          )}
        >
          {playNow.label}
          <ArrowRight aria-hidden="true" className="h-5 w-5 rtl:-scale-x-100" />
        </Link>
        <a
          href="#waitlist"
          className={cn(
            'inline-flex min-h-12 items-center justify-center rounded-neo border-neo-thick border-neo-black bg-neo-cream px-6 py-3 text-base text-neo-black shadow-hard transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-neo-navy',
            typo.display
          )}
        >
          {playNow.waitlistLabel}
        </a>
      </div>
      <Link
        href={sibling.href}
        lang={sibling.lang}
        dir={sibling.lang === 'ar' ? 'rtl' : 'ltr'}
        className={cn('mt-6 inline-block text-lg font-bold text-neo-black underline decoration-2 underline-offset-4', sibling.lang === 'ar' ? arabicText : 'font-neo-body')}
      >
        {sibling.label}
      </Link>
    </section>
  );
}
