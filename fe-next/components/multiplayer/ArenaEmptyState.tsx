'use client';

import React from 'react';
import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';

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
 * Content-sized on phones (never squeezed): the entry body scrolls before any
 * of this is clipped behind the footer.
 */
const ArenaEmptyState: React.FC<ArenaEmptyStateProps> = ({ languageName, elsewhere }) => {
  const { t } = useLanguage();
  return (
    <div
      data-testid="arena-empty-state"
      className="isolate flex flex-1 flex-col items-center justify-center gap-2 lg:min-h-0 lg:gap-3 rounded-neo-lg border-3 border-dashed border-neo-white/25 bg-neo-navy px-4 py-4 text-center"
    >
      {/* The sticker carries its own dark backdrop, a shade off the page navy:
          lightened into this navy group, the box disappears. */}
      <Image
        src="/mascot/spectating.webp"
        alt=""
        aria-hidden="true"
        width={96}
        height={96}
        loading="eager"
        className="h-[clamp(56px,10dvh,88px)] w-auto lg:h-32 tv:h-44 shrink-0 rounded-neo object-contain mix-blend-lighten motion-safe:animate-mp-bump"
      />
      <div className="min-w-0">
        <p className="text-balance font-neo-display text-base sm:text-lg lg:text-2xl tv:text-4xl font-bold leading-tight text-neo-white">
          {t('mpUi.entry.emptyInLanguage', { language: languageName })}
        </p>
        <p className="mt-1 text-balance text-sm lg:text-base tv:text-2xl text-neo-white/75">{t('mpUi.entry.emptyLine')}</p>
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
  );
};

export default ArenaEmptyState;
