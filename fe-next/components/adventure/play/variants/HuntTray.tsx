'use client';

/**
 * HUNT: the hidden words as masked slots (first letter as the clue). A found
 * word flips its letters in and gets stamped. Words come from the server
 * (`run.targets`), matched by the run hook (`run.targetsFound`) — no re-matching here.
 */
import { memo } from 'react';
import { Check, Search } from 'lucide-react';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { displayTarget } from '@/lib/adventure/play/deal';
import { cn } from '@/lib/utils';
import './variants.css';

interface Props {
  targets: readonly string[];
  found: readonly string[];
  /** Words needed to win (targets carry one spare). */
  need: number;
  language: string;
}

function HuntTray({ targets, found, need, language }: Props) {
  const { t } = useLanguageSafe();
  const done = found.length;
  return (
    <section className="mt-2 rounded-xl border-[3px] border-black bg-[#1a1a2e]/95 px-2.5 py-2 shadow-[3px_3px_0_#000]" data-testid="hunt-tray"
      aria-label={t('adventurePlay.variety.huntTitle')}>
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 font-neo-display text-sm font-bold uppercase tracking-wide">
          <Search className="w-4 h-4 text-neo-lime" strokeWidth={3} /> {t('adventurePlay.variety.huntTitle')}
        </span>
        <span className={cn('rounded-md border-2 border-black px-1.5 font-neo-display font-bold tabular-nums text-black', done >= need ? 'bg-neo-lime' : 'bg-neo-cream')}
          aria-live="polite">{t('adventurePlay.variety.huntCount', { found: done, need })}</span>
      </div>
      <ul className="mt-1.5 flex flex-wrap justify-center gap-x-3 gap-y-1.5">
        {targets.map((w) => {
          const isFound = found.includes(w);
          const letters = Array.from(displayTarget(w, language).toUpperCase());
          return (
            <li key={w} className={cn('relative flex gap-0.5', isFound && 'hunt-found')} data-found={isFound || undefined}
              aria-label={isFound ? letters.join('') : t('adventurePlay.variety.huntMasked', { first: letters[0], count: letters.length })}>
              {letters.map((ch, i) => (
                <span key={i} style={{ ['--i' as string]: i }}
                  className={cn('hunt-slot grid h-7 w-6 place-items-center rounded-md border-2 border-black font-neo-display text-base font-bold',
                    isFound ? 'bg-neo-lime text-black' : i === 0 ? 'bg-neo-cream text-black' : 'bg-white/10 text-transparent')}>
                  {isFound || i === 0 ? ch : '_'}
                </span>
              ))}
              {isFound && (
                <span className="hunt-stamp absolute -top-2 -end-2 grid h-5 w-5 place-items-center rounded-full border-2 border-black bg-neo-pink text-black" aria-hidden>
                  <Check className="h-3 w-3" strokeWidth={4} />
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default memo(HuntTray);
