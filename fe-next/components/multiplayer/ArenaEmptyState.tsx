'use client';

import React from 'react';
import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';
import { MascotRig } from '@/components/motion/MascotRig';

interface ArenaEmptyStateProps {
  /** The filtered board language, already in the viewer's words. */
  languageName: string;
  /** Another language that does have open rooms right now. */
  elsewhere?: { flag: string; name: string; count: number; onSwitch: () => void };
}

/**
 * No open rooms in this language. It carries no CREATE of its own: the entry
 * has exactly one (the footer on phones, the left column on desktop), and its
 * line points at QUICK START, the primary right under it. The only action here
 * is the chip that switches the list to a language that does have rooms.
 *
 * On phones the region takes the height the list leaves (at least 14.5rem, so its
 * content always fits: the entry body scrolls before anything is clipped
 * behind the footer) and the mascot grows to fill it, up to 180px.
 */
const ArenaEmptyState: React.FC<ArenaEmptyStateProps> = ({ languageName, elsewhere }) => {
  const { t } = useLanguage();
  return (
    <div
      data-testid="arena-empty-state"
      className="mp-arena-empty flex min-h-[14.5rem] flex-1 flex-col lg:min-h-0"
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-2 lg:gap-3 px-4 py-4 text-center">
        {/* On phones the mascot grows with the region (arenaList.css: a size container). */}
        <MascotRig>
          <Image
            src="/mascot/popcorn-nobg.webp"
            alt=""
            aria-hidden="true"
            width={320}
            height={320}
            loading="eager"
            data-testid="arena-empty-mascot"
            className="h-[clamp(56px,calc(100cqh_-_172px),180px)] w-auto lg:h-32 tv:h-44 shrink-0 object-contain"
          />
        </MascotRig>
        <div className="min-w-0">
          <p className="text-balance font-neo-display text-base sm:text-lg lg:text-2xl tv:text-4xl font-bold leading-tight text-neo-white">
            {t('mpUi.entry.emptyInLanguage', { language: languageName })}
          </p>
        </div>
        {elsewhere && (
          <button
            type="button"
            data-testid="arena-empty-elsewhere"
            onClick={elsewhere.onSwitch}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full border-2 border-neo-cyan bg-neo-navy-light px-3 py-1 text-xs tv:text-lg font-bold text-neo-cyan transition-transform hover:-translate-y-0.5 active:translate-y-0.5 focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-lime"
          >
            <span aria-hidden="true">{elsewhere.flag}</span>
            {t('mpUi.entry.openElsewhere', { count: elsewhere.count, language: elsewhere.name })}
          </button>
        )}
      </div>
    </div>
  );
};

export default ArenaEmptyState;
