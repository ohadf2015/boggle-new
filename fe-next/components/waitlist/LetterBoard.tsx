import Image from 'next/image';
import { cn } from '@/lib/utils';
import { BOARD, TRACE, traceIndex, traceWord } from './boardData';
import styles from './waitlist.module.css';
import { arabicText, type Typo } from './typography';

interface LetterBoardProps {
  stamp: string;
  caption: string;
  alt: string;
  typo: Typo;
}

const points = TRACE.map(([r, c]) => `${c + 0.5},${r + 0.5}`).join(' ');

export function LetterBoard({ stamp, caption, alt, typo }: LetterBoardProps) {
  return (
    <figure className="relative mx-auto w-full max-w-[21rem] pt-5 sm:max-w-sm lg:max-w-md">
      <div className={cn('relative rounded-neo-lg border-neo-thick border-neo-black bg-neo-navy-light p-2.5 text-neo-white shadow-hard-xl sm:p-3.5', styles.dots)}>
        <div data-board aria-hidden="true" dir="ltr" className={cn('relative grid grid-cols-4', arabicText)}>
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 4 4" preserveAspectRatio="none">
            <polyline points={points} className="fill-none stroke-neo-black" strokeWidth={26} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            <polyline points={points} className="fill-none stroke-neo-pink" strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </svg>
          {BOARD.flatMap((row, r) =>
            row.map((ch, c) => {
              const step = traceIndex(r, c);
              const traced = step >= 0;
              return (
                <div key={`${r}-${c}`} className="relative aspect-square p-1.5 sm:p-2.5">
                  <span
                    data-tile
                    className={cn(
                      'relative flex h-full w-full items-center justify-center rounded-neo border-neo-thick border-neo-black pb-1 text-3xl font-extrabold leading-none text-neo-black shadow-hard-lg sm:text-4xl',
                      traced ? cn('bg-neo-lime', styles.traceTile) : 'bg-neo-cream transition-transform duration-150 hover:-translate-y-1'
                    )}
                    style={traced ? { animationDelay: `${0.6 + step * 0.14}s` } : undefined}
                  >
                    {ch}
                    {traced && (
                      <span className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full border-2 border-neo-black bg-neo-navy font-neo-display text-[11px] font-black text-neo-white">
                        {step + 1}
                      </span>
                    )}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      <span
        data-stamp
        className={cn(
          'absolute -top-1 end-3 z-10 inline-block rounded-neo border-neo-thick border-neo-black bg-neo-pink px-3 py-1 text-neo-black shadow-hard-lg sm:end-5',
          typo.rtl ? cn(arabicText, 'text-2xl font-extrabold') : 'font-neo-display text-sm font-black uppercase tracking-widest sm:text-base',
          styles.stamp
        )}
      >
        {stamp}
      </span>

      <figcaption className="relative mt-5 flex items-center gap-3 ps-14 sm:ps-20">
        <span
          aria-hidden="true"
          lang="ar"
          dir="rtl"
          className={cn('shrink-0 rounded-neo border-neo-thick border-neo-black bg-neo-lime px-3 py-0.5 text-2xl font-extrabold text-neo-black shadow-hard', arabicText)}
        >
          {traceWord()}
        </span>
        <span className={cn('text-sm font-bold leading-snug text-neo-white', typo.body)}>{caption}</span>
        <span className="sr-only">{alt}</span>
      </figcaption>

      <span aria-hidden="true" className="pointer-events-none absolute -bottom-5 start-[-0.5rem] w-16 sm:w-24">
        <Image src="/mascot/hello-nobg.webp" alt="" width={320} height={320} sizes="112px" className={cn('h-auto w-full', styles.mascot)} />
      </span>
    </figure>
  );
}
