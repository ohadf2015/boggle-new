'use client';

/**
 * PracticePickerHero — the one practice the picker actually recommends.
 *
 * The grid this sits on top of used to open with fourteen equal tiles. Fourteen
 * equal tiles is not a choice, it is a reading assignment: nothing is
 * recommended, so the student has to rank them, and the ranking is the part the
 * product should have done. Most of them drill the same eight words anyway, so
 * the cost of picking "wrong" is nearly zero and the cost of hesitating is a
 * student who closes the tab.
 *
 * So one tile gets promoted to a poster the size of a hand with a single big
 * PLAY on it. One tap and the round starts. The ranking that chooses it lives in
 * `lib/education/practiceShortlist` and is deterministic — a recommendation that
 * moves between renders would be worse than none at all.
 *
 * The accent is the hero's own fill, because a tappable surface has to differ
 * from the page by fill or border and a navy card on a navy page measures
 * 1.2:1 however loud its contents are. The width is written literally as
 * `border-[3px]`: `border-neo` is not a utility this Tailwind config defines at
 * all, and tailwind-merge can collapse a numeric width class into the colour
 * group — either way preflight's `border-width: 0` wins and the control ships
 * with no edge.
 */

import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Play, Zap } from 'lucide-react';
import { practiceHeroArt, practiceTileAccent } from '@/lib/education/practiceTileArt';
import { practiceXpRate } from '@/lib/education/practiceJuice';
import type { PracticeTile } from '@/lib/education/practicePicker';

export interface PracticePickerHeroProps {
  tile: PracticeTile;
  onSelect: (tile: PracticeTile) => void;
}

export default function PracticePickerHero({ tile, onSelect }: PracticePickerHeroProps) {
  const { t } = useLanguage();
  const art = practiceHeroArt(tile.id);
  const accent = practiceTileAccent(tile.id);
  const xp = practiceXpRate(tile.id);

  const countLabel =
    tile.countKind === 'questions'
      ? t('education.practicePicker.questions', { count: tile.count })
      : t('education.practicePicker.words', { count: tile.count });

  return (
    <button
      type="button"
      data-testid="practice-picker-hero"
      data-tile={tile.id}
      onClick={() => onSelect(tile)}
      // Inline, not a `min-h-[…]` class. This one number decides whether the
      // mascot has any room at all — at `auto` the poster collapses to the
      // height of its own name band and the art disappears — so it does not
      // depend on a stylesheet being in step with the markup.
      style={{ minHeight: 248 }}
      className={cn(
        'group relative flex w-full flex-col overflow-hidden rounded-neo border-[3px] border-black text-start shadow-hard-lg transition-all',
        accent,
        'text-black hover:-translate-y-0.5 active:translate-y-[2px] active:shadow-hard'
      )}
    >
      {/* The mascot floats on the accent. Transparent art only: it cannot crop
          wrong at any width, and it keeps the mode colour visible behind it
          instead of letting a navy poster plate swallow the whole card. */}
      <span
        // Inline geometry for the same reason as the card's min-height above:
        // this is the mascot's whole allowance, not a decoration.
        style={{ bottom: 104 }}
        className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-center"
      >
        <Image
          data-testid={`practice-hero-art-${tile.id}`}
          src={art}
          alt=""
          width={260}
          height={260}
          unoptimized
          priority
          style={{ maxWidth: '62%', filter: 'drop-shadow(3px 3px 0 rgba(0,0,0,0.35))' }}
          className="h-full w-auto object-contain"
        />
      </span>

      {/* RECOMMENDED rides on the accent, so its label is black per the palette
          audit (cream on lime measures 1.2:1, black on lime 14+). */}
      <span
        data-testid="practice-picker-hero-badge"
        className="relative m-2.5 inline-flex w-fit items-center gap-1 rounded-[4px] border-[2px] border-black bg-neo-cream px-2 py-1 font-neo-display text-[11px] font-black uppercase leading-none tracking-wide text-black"
      >
        {t('student.practiceFun.recommended')}
      </span>

      {/* Name, one meta line, and the single primary action, on a hard band so
          they stay legible over any art. */}
      <span className="relative mt-auto w-full border-t-[3px] border-black bg-neo-navy px-3 pb-3 pt-2">
        <span className="block font-neo-display text-xl font-black uppercase leading-none text-neo-white text-balance">
          {t(tile.titleKey)}
        </span>
        <span className="mt-1.5 flex flex-wrap items-center gap-1.5 font-neo-body text-[11px] font-bold leading-none text-neo-cream">
          {xp > 0 && (
            <span
              data-testid={`practice-hero-xp-${tile.id}`}
              className="inline-flex items-center gap-0.5 rounded-[4px] border-[2px] border-black bg-neo-yellow px-1.5 py-0.5 tabular-nums text-black"
            >
              <Zap className="h-3 w-3 fill-black" aria-hidden="true" />
              {t('student.practiceFun.xpRate', { xp })}
            </span>
          )}
          <span className="tabular-nums">{countLabel}</span>
        </span>

        <span
          data-testid="practice-picker-hero-play"
          role="presentation"
          className="mt-2.5 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-neo border-[3px] border-black bg-neo-lime px-4 font-neo-display text-lg font-black uppercase text-black shadow-hard group-active:translate-y-[2px] group-active:shadow-hard-pressed"
        >
          <Play className="h-5 w-5 fill-black" aria-hidden="true" />
          {t('student.practiceFun.playNow')}
        </span>
      </span>
    </button>
  );
}
