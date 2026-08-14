'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { safeToLocaleString } from '@/utils/bcp47Locale';
import { SURPRISE_META, type ActiveSurprise } from '@/lib/blast/v2/surprise';
import { BlastIcon } from './BlastIcon';

const VISIBLE_MS = 1600;

/**
 * The in-game variable-reward pop. Fires when a word triggers a surprise (see
 * surprise.ts). Keyed on `surprise.key` so a repeat event re-animates, and
 * auto-dismisses after VISIBLE_MS. Floats over the board top so it lands in
 * peripheral vision without covering the tiles the player is tracing.
 */
export function BlastSurpriseBanner({
  surprise,
  modeColor,
}: {
  surprise: ActiveSurprise | null;
  modeColor: string;
}) {
  const { t, language } = useLanguage();
  const reduce = useReducedMotion();
  const [shown, setShown] = useState<ActiveSurprise | null>(null);

  useEffect(() => {
    if (!surprise) return;
    setShown(surprise);
    const id = setTimeout(() => setShown(null), VISIBLE_MS);
    return () => clearTimeout(id);
  }, [surprise]);

  if (!shown) return null;

  const meta = SURPRISE_META[shown.event];
  const coins = Math.round(shown.coins);
  const chestPct = Math.round(shown.chestProgress * 100);
  const rewardBits: (string | ReactNode)[] = [];
  if (coins > 0) rewardBits.push(`+${safeToLocaleString(coins, language)} `);
  if (coins > 0) rewardBits.push(<BlastIcon key="coin-icon" src="/blast/icons/coin.svg" size={16} />);
  if (chestPct > 0) rewardBits.push(`+${safeToLocaleString(chestPct, language)}% `);
  if (chestPct > 0) rewardBits.push(<BlastIcon key="gem-icon" src="/blast/icons/gem.svg" size={16} />);
  if (shown.event === 'lucky_double') rewardBits.push(t('blast.surprise.nextWordDouble', 'Next word ×2'));

  return (
    <m.div
      key={shown.key}
      data-testid="surprise-banner"
      data-event={shown.event}
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6, y: -14 }}
      animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={reduce ? { duration: 0.15 } : { type: 'spring', stiffness: 420, damping: 16 }}
      className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-3 z-30 flex items-center gap-2 rounded-full px-4 py-2 text-[#0b1530]"
      style={{
        background: modeColor,
        border: '2px solid #0b1530',
        boxShadow: '3px 3px 0 #0b1530',
      }}
    >
      <BlastIcon src={meta.icon} size={20} className="drop-shadow-[0_0_4px_#0b1530]" />
      <span className="text-[12px] font-black uppercase tracking-[0.14em]">
        {t(`blast.surprise.${meta.key}.title`, shown.event)}
      </span>
      {rewardBits.length > 0 && (
        <span className="text-[12px] font-bold tabular-nums">{rewardBits.join(' · ')}</span>
      )}
    </m.div>
  );
}
