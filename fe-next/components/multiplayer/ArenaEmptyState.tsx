'use client';

import React from 'react';
import Image from 'next/image';
import { Plus } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface ArenaEmptyStateProps {
  /** The filtered board language, already in the viewer's words. */
  languageName: string;
  onStart: () => void;
  /** Another language that does have open rooms right now. */
  elsewhere?: { flag: string; name: string; count: number; onSwitch: () => void };
}

/** Nothing here leaves multiplayer: START ONE opens CREATE, the chip only switches the list's language. */
const ArenaEmptyState: React.FC<ArenaEmptyStateProps> = ({ languageName, onStart, elsewhere }) => {
  const { t } = useLanguage();
  return (
    <div
      data-testid="arena-empty-state"
      className="isolate flex min-h-0 flex-1 flex-col items-center justify-center gap-2 lg:gap-3 rounded-neo-lg border-3 border-dashed border-neo-white/25 bg-neo-navy px-4 py-3 text-center"
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
        className="h-[clamp(48px,12dvh,96px)] w-auto lg:h-32 tv:h-44 shrink rounded-neo object-contain mix-blend-lighten motion-safe:animate-mp-bump"
      />
      <div className="min-w-0">
        <p className="text-balance font-neo-display text-lg lg:text-2xl tv:text-4xl font-bold leading-tight text-neo-white">
          {t('mpUi.entry.emptyInLanguage', { language: languageName })}
        </p>
        <p className="mt-0.5 text-sm lg:text-base tv:text-2xl text-neo-white/85">{t('mpUi.entry.emptyLine')}</p>
      </div>
      <button
        type="button"
        data-testid="arena-empty-start"
        onClick={onStart}
        className="inline-flex h-12 tv:h-16 items-center justify-center gap-2 rounded-neo-lg border-3 border-neo-pink bg-neo-navy-light px-6 font-neo-display text-base tv:text-2xl font-bold uppercase text-neo-pink shadow-hard transition-transform duration-100 hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-y-0.5 active:shadow-hard-pressed focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-lime"
      >
        <Plus aria-hidden="true" className="h-5 w-5 tv:h-7 tv:w-7" />
        {t('mpUi.entry.startOne')}
      </button>
      {elsewhere && (
        <button
          type="button"
          data-testid="arena-empty-elsewhere"
          onClick={elsewhere.onSwitch}
          className="inline-flex items-center gap-1.5 rounded-full border-2 border-neo-cyan bg-neo-navy-light px-3 py-1 text-xs tv:text-lg font-bold text-neo-cyan transition-transform hover:-translate-y-0.5 active:translate-y-0.5 focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-lime"
        >
          <span aria-hidden="true">{elsewhere.flag}</span>
          {t('mpUi.entry.openElsewhere', { count: elsewhere.count, language: elsewhere.name })}
        </button>
      )}
    </div>
  );
};

export default ArenaEmptyState;
