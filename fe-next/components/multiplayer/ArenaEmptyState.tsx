'use client';

import React from 'react';
import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * No open arenas (DESIGN §b.1): one mascot line — "No open arenas — Quick Start
 * fills the seats with bots" — and NO buttons. The footer's QUICK START is the
 * only call to action; the old QUICK PLAY / DAILY CHALLENGE pair competed with
 * it and DAILY linked out of multiplayer.
 */
const ArenaEmptyState: React.FC = () => {
  const { t } = useLanguage();
  return (
    <div
      data-testid="arena-empty-state"
      className="isolate flex min-h-0 flex-1 flex-col items-center justify-center gap-2 rounded-neo-lg border-3 border-dashed border-neo-white/25 bg-neo-navy px-4 py-4 text-center"
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
        className="h-24 w-24 lg:h-32 lg:w-32 tv:h-44 tv:w-44 shrink rounded-neo object-contain mix-blend-lighten motion-safe:animate-mp-bump"
      />
      <div className="min-w-0">
        <p className="font-neo-display text-lg lg:text-2xl tv:text-4xl font-bold uppercase leading-tight text-neo-white">
          {t('mpUi.entry.emptyTitle')}
        </p>
        <p className="text-sm lg:text-base tv:text-2xl text-neo-white/85">{t('mpUi.entry.emptyLine')}</p>
      </div>
    </div>
  );
};

export default ArenaEmptyState;
