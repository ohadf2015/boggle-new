'use client';

/**
 * Tap-to-open chest under the new-modes spotlight: each tap rolls one real item
 * from the Adventure relic and Word Tower chest pools. The variable-reward hook
 * is honest: it previews what CAN drop, it grants nothing.
 *
 * Random runs only on click, so the server and the first client paint agree on
 * a closed chest (pitfall class 1: no render-time randomness on a SSR tree).
 * Motion is one moment (chest shake + item pop), small, behind motion-safe.
 */
import Image from 'next/image';
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { cn } from '@/lib/utils';

type ChestTier = 'common' | 'rare' | 'epic';
export interface LootItem {
  id: string;
  mode: 'adventure' | 'wordTowerV2';
  img: string;
  tier?: ChestTier;
}

const relic = (id: string): LootItem => ({ id, mode: 'adventure', img: `/images/adventure/relics/${id}.webp` });
const chest = (tier: ChestTier): LootItem => ({
  id: `chest-${tier}`, mode: 'wordTowerV2', tier, img: `/images/word-tower-v2/empire/chest-${tier}-open.webp`,
});

export const LOOT_POOL: readonly LootItem[] = [
  relic('lucky-clover'), chest('epic'), relic('phoenix-feather'), relic('storm-rune'), chest('rare'),
  relic('hourglass'), relic('vampire-fang'), chest('common'), relic('lens-of-insight'), relic('heart-locket'),
];

/** Uniform pick that never repeats the previous item, so every tap feels like a new roll. */
function roll(prev: number | null): number {
  if (prev === null) return Math.floor(Math.random() * LOOT_POOL.length);
  const step = 1 + Math.floor(Math.random() * (LOOT_POOL.length - 1));
  return (prev + step) % LOOT_POOL.length;
}

export function LootPeek() {
  const { t } = useLanguage();
  const [idx, setIdx] = useState<number | null>(null);
  const [rolls, setRolls] = useState(0);
  const item = idx === null ? null : LOOT_POOL[idx];

  const label = (i: LootItem) =>
    i.tier
      ? t('newModes.loot.chest', { tier: t(`wordTowerV2.chest.tier.${i.tier}`) })
      : t(`adventurePlay.relic.${i.id}`);

  const open = () => {
    const next = roll(idx);
    setIdx(next);
    setRolls(rolls + 1);
    trackGrowthEvent('new_modes_loot_peek', { item: LOOT_POOL[next].id, roll: rolls + 1 });
  };

  return (
    <div
      data-loot-peek
      className="flex items-center gap-4 rounded-neo border-3 border-neo-black bg-neo-cream p-3 text-neo-black shadow-hard-lg sm:gap-5 sm:p-4"
    >
      <button
        type="button"
        onClick={open}
        className={cn(
          'group flex shrink-0 flex-col items-center gap-1 rounded-neo border-3 border-neo-black bg-neo-yellow px-3 pb-2 pt-1 shadow-hard',
          'font-neo-display text-xs font-black uppercase tracking-wide',
          'active:translate-y-[2px] active:shadow-hard-pressed motion-safe:transition-transform motion-safe:hover:-translate-y-0.5',
          'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-neo-black'
        )}
      >
        <Image
          key={rolls}
          src={item ? '/images/adventure/loot/chest-open.webp' : '/images/adventure/loot/chest-closed.webp'}
          alt=""
          width={56}
          height={56}
          className={cn('h-12 w-12 select-none sm:h-14 sm:w-14', rolls > 0 && 'motion-safe:animate-neo-shake')}
        />
        {t(item ? 'newModes.loot.again' : 'newModes.loot.tap')}
      </button>

      <div className="flex min-w-0 flex-1 items-center gap-3">
        {item && (
          <Image
            key={`item-${rolls}`}
            data-loot-item={item.id}
            src={item.img}
            alt=""
            width={64}
            height={64}
            className="h-14 w-14 shrink-0 select-none drop-shadow-[2px_2px_0_rgb(var(--neo-black))] motion-safe:animate-neo-pop sm:h-16 sm:w-16"
          />
        )}
        <div role="status" aria-live="polite" className="min-w-0">
          {item ? (
            <>
              <p className="font-neo-display text-lg font-bold leading-tight">{label(item)}</p>
              <p className="font-neo-body text-sm text-neo-black/75">
                {t(item.mode === 'adventure' ? 'newModes.adventureTitle' : 'newModes.wordTowerTitle')}
              </p>
            </>
          ) : (
            <>
              <p className="font-neo-display text-lg font-bold leading-tight">{t('newModes.loot.title')}</p>
              <p className="font-neo-body text-sm leading-snug text-neo-black/75">{t('newModes.loot.line')}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
