'use client';

/**
 * PracticePickerTile — one poster in the practice grid.
 *
 * The tile this replaces was a cream card carrying four stacked rows: an icon,
 * the mode name, a full sentence describing the skill, a word-count badge and a
 * play count. Thirteen of those do not fit a 390x844 phone without scrolling
 * the page, and the sentence was the part nobody read.
 *
 * A poster carries a picture, a name and exactly one meta line — what the mode
 * pays and how much material the lesson supplies. That is the whole decision a
 * student is making, and it fits two-up on a phone.
 *
 * Locked tiles stay on the board on purpose, as they always have: "add synonyms
 * to unlock" is how a student learns the lesson has more in it. They lose the
 * picture's colour (greyed, padlocked) but keep their place, so the grid does
 * not reflow as a teacher fills the lesson in.
 */

import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Lock, Zap } from 'lucide-react';
import { practiceTileArt, practiceTileAccent } from '@/lib/education/practiceTileArt';
import { practiceXpRate } from '@/lib/education/practiceJuice';
import type { PracticeTile } from '@/lib/education/practicePicker';

export interface PracticePickerTileProps {
  tile: PracticeTile;
  onSelect: (tile: PracticeTile) => void;
}

export default function PracticePickerTile({ tile, onSelect }: PracticePickerTileProps) {
  const { t } = useLanguage();
  const art = practiceTileArt(tile.id);
  const accent = practiceTileAccent(tile.id);
  const xp = practiceXpRate(tile.id);

  const countLabel =
    tile.countKind === 'questions'
      ? t('education.practicePicker.questions', { count: tile.count })
      : t('education.practicePicker.words', { count: tile.count });

  return (
    <button
      type="button"
      data-testid={`practice-tile-${tile.id}`}
      disabled={!tile.ready}
      aria-disabled={!tile.ready}
      onClick={() => tile.ready && onSelect(tile)}
      className={cn(
        // The ACCENT is the button's own fill, not a child's. A tappable thing
        // has to differ from the surface around it by fill or border; a navy
        // button on a navy grid measures 1.2:1 however loud its contents are.
        // A fixed min-height, NOT `aspect-[x/y]`. An aspect-ratio box whose width
        // comes from the grid column is a circular dependency Chrome resolves by
        // sizing the ROW from the tile's in-flow content (the name band, ~46px)
        // while the tile itself takes its full aspect height — so every row
        // overlapped the one below it. A min-height contributes to track sizing
        // directly and renders identically.
        'group relative flex min-h-[168px] w-full flex-col overflow-hidden rounded-neo border-3 text-start transition-all sm:min-h-[196px]',
        tile.ready
          ? cn(
              accent,
              // Black text ON the accent: the name band below sets its own
              // colour, but the button's default has to be legible against the
              // button's own fill, not only against the band painted over it.
              'border-black text-black shadow-hard hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-y-[2px] active:shadow-hard-pressed'
            )
          : // Locked keeps the navy fill — that IS the lock — so a light border
            // is the only thing left to say "this is a control, just not yet".
            'cursor-not-allowed border-neo-white/45 bg-neo-navy text-neo-cream opacity-60'
      )}
    >
      {/* Art: bespoke poster bleeds to the edges, chip art floats on the accent. */}
      {art.kind === 'poster' ? (
        // Inset by the frame width so the accent shows as a hard rim around the
        // poster. Bespoke posters are painted on the same navy as the page, so
        // edge-to-edge art would put a navy tile on a navy grid again.
        <span data-poster-frame="" className="absolute inset-[3px] overflow-hidden rounded-[5px]">
          <Image
            data-testid={`practice-tile-art-${tile.id}`}
            src={art.src}
            alt=""
            fill
            sizes="(max-width: 640px) 45vw, 180px"
            unoptimized
            className={cn('object-cover object-top', !tile.ready && 'grayscale')}
          />
        </span>
      ) : (
        <span className="absolute inset-0 flex items-start justify-center pt-3">
          <Image
            data-testid={`practice-tile-art-${tile.id}`}
            src={art.src}
            alt=""
            width={96}
            height={96}
            unoptimized
            className={cn('h-[52%] w-auto object-contain', !tile.ready && 'grayscale')}
          />
        </span>
      )}

      {/* Name + one meta line, on a hard band so they read over any art. */}
      <span className="relative mt-auto w-full border-t-3 border-black bg-neo-navy/95 px-2 py-1.5 backdrop-blur-[2px]">
        <span className="block font-neo-display text-[13px] font-black uppercase leading-[1.1] text-neo-white text-balance">
          {t(tile.titleKey)}
        </span>
        <span
          data-tile-line=""
          className="mt-0.5 flex flex-wrap items-center gap-1 font-neo-body text-[10px] font-bold leading-none text-neo-white/75"
        >
          {tile.ready ? (
            <>
              {xp > 0 && (
                <span
                  data-testid={`practice-tile-xp-${tile.id}`}
                  className="inline-flex items-center gap-0.5 rounded-[4px] border-2 border-black bg-neo-yellow px-1 py-0.5 tabular-nums text-black"
                >
                  <Zap className="h-2.5 w-2.5 fill-black" aria-hidden="true" />
                  {t('student.practiceFun.xpRate', { xp })}
                </span>
              )}
              <span className="tabular-nums">{countLabel}</span>
              {tile.sessions > 0 && (
                <span
                  data-testid={`practice-tile-plays-${tile.id}`}
                  className="tabular-nums text-neo-white/55"
                >
                  {t('education.practicePicker.played', { count: tile.sessions })}
                </span>
              )}
            </>
          ) : (
            <span className="inline-flex items-center gap-1">
              <Lock className="h-2.5 w-2.5" aria-hidden="true" />
              {t(tile.lockedKey ?? tile.skillKey, { min: 4 })}
            </span>
          )}
        </span>
      </span>

      {/* Accent rail — the colour code survives even under a full-bleed poster. */}
      <span
        className={cn('absolute inset-x-0 bottom-0 h-1.5', tile.ready ? accent : 'bg-neo-white/25')}
        aria-hidden="true"
      />
    </button>
  );
}
