'use client';

import Link from 'next/link';
import { PressSurface } from '@/components/motion/PressSurface';
import { ModeGlyph } from '@/components/quick-play/ModeGlyph';
import { NODE_COLORS } from '@/components/quick-play/modeColors';
import type { QuickMode } from '@/components/quick-play/types';
import { quickPlayHref } from '@/lib/quickPlay/startMode';

const MODES: QuickMode[] = ['classic', 'blast', 'word-hunt', 'wheel-rush'];
const TILT = ['-rotate-2', 'rotate-1', '-rotate-1', 'rotate-2'];

interface ModeRailProps {
  lang: string;
  t: (key: string, params?: Record<string, string | number>) => string;
}

/** Tier 4 of the hero: the solo modes as filled colour-coded keys, one row. */
export function ModeRail({ lang, t }: ModeRailProps) {
  return (
    <div>
      <p className="mb-2 text-center text-xs font-bold text-neo-white/60 lg:text-sm">{t('homePlay.pickMode')}</p>
      <ul className="grid grid-cols-4 gap-2.5 lg:gap-3" data-testid="hp-keycaps">
        {MODES.map((mode, i) => (
          <li key={mode} className={`min-w-0 ${TILT[i]}`}>
            <PressSurface asChild lip={4}>
              <Link
                href={quickPlayHref(lang, mode)}
                className={`flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-2xl border-[3px] border-black text-black ${NODE_COLORS[mode].bg}`}
              >
                <ModeGlyph mode={mode} size={30} className="lg:h-9 lg:w-9" />
                <span className="max-w-full truncate px-0.5 font-neo-display text-[13px] font-bold leading-none lg:text-sm">{t(`quickPlay.solo.mode.${mode}`)}</span>
              </Link>
            </PressSurface>
          </li>
        ))}
      </ul>
    </div>
  );
}
