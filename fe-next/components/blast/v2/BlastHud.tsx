'use client';
import { useEffect, useRef, useState } from 'react';
import { m, useMotionValue, useTransform, animate } from 'framer-motion';
import { mechanicsForLevel } from '@/lib/blast/v2/mechanic-flags';
import { useLanguage } from '@/contexts/LanguageContext';
import { BlastChestBadge } from './BlastChestBadge';
import { BlastChestPreviewModal } from './BlastChestPreviewModal';
import type { ChestContents } from '@/lib/blast/v2/chest-roll';

type Props = {
  levelNumber: number;
  coins: number;
  chestNumber: number;
  chestProgress: number;
  chestContents: ChestContents | null;
  onShuffle: () => void;
  onHint: () => void;
  modeColor?: string;
  theme?: string;
};

// Animated coin counter — pops to scale 1.18 on increment, eases back to 1.
// Independent of the chest progress bar so the two reactions don't visually
// fight when both fire at the same time after a word commit.
function CoinDisplay({ coins, modeColor }: { coins: number; modeColor: string }) {
  const mv = useMotionValue(coins);
  const display = useTransform(mv, (v) => Math.round(v).toLocaleString());
  const scale = useMotionValue(1);
  const prev = useRef(coins);

  useEffect(() => {
    if (prev.current === coins) return;
    const ctrl = animate(mv, coins, { duration: 0.45, ease: 'easeOut' });
    const pop = animate(scale, [1, 1.22, 1], { duration: 0.5, ease: 'easeOut' });
    prev.current = coins;
    return () => {
      ctrl.stop();
      pop.stop();
    };
  }, [coins, mv, scale]);

  return (
    <m.div
      data-testid="coin-counter"
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-black text-base tabular-nums"
      style={{
        scale,
        background: 'rgba(0,0,0,0.45)',
        border: `2px solid ${modeColor}`,
        boxShadow: `2px 2px 0 0 #0b1530, 0 0 14px color-mix(in srgb, ${modeColor} 50%, transparent)`,
        color: '#fff',
        textShadow: `1px 1px 0 #0b1530`,
      }}
    >
      <span aria-hidden style={{ filter: 'drop-shadow(0 0 4px #fbbf24)' }}>🪙</span>
      <m.span>{display}</m.span>
    </m.div>
  );
}

export function BlastHud({
  levelNumber,
  coins,
  chestNumber,
  chestProgress,
  chestContents,
  onShuffle: _onShuffle,
  onHint,
  modeColor = '#BFFF00',
  theme,
}: Props) {
  const { t } = useLanguage();
  const mech = mechanicsForLevel(levelNumber);
  const [showPreview, setShowPreview] = useState(false);

  return (
    <>
      <div
        className="relative flex items-center justify-between gap-2 px-3 py-2.5 bg-[#0b1530] text-white"
        style={{
          // Theme-tinted gradient sweep across HUD background so each level
          // reads as its own mode (lime/cyan/pink/purple). Subtle — keeps
          // contrast on the white-faced tiles.
          backgroundImage: `linear-gradient(90deg, rgba(11,21,48,1) 0%, color-mix(in srgb, ${modeColor} 22%, #0b1530) 50%, rgba(11,21,48,1) 100%)`,
          boxShadow: `inset 0 -3px 0 ${modeColor}, 0 4px 12px rgba(0,0,0,0.4)`,
        }}
      >
        <div
          className="flex items-center gap-2 min-w-0 px-2.5 py-1 rounded-lg"
          style={{
            background: 'rgba(0,0,0,0.35)',
            border: `2px solid color-mix(in srgb, ${modeColor} 60%, transparent)`,
            boxShadow: `2px 2px 0 0 #0b1530`,
          }}
        >
          <span
            aria-hidden
            className="inline-block w-2.5 h-8 rounded-sm shrink-0"
            style={{ background: modeColor, boxShadow: `0 0 14px ${modeColor}` }}
          />
          <div className="flex flex-col leading-none min-w-0">
            <span
              data-testid="level-label"
              className="text-[10px] font-bold uppercase tracking-wider opacity-70"
            >
              {t('blast.level', `Level ${levelNumber}`, { n: String(levelNumber) })}
            </span>
            {theme && (
              <span
                data-testid="theme-label"
                className="text-base font-black uppercase tracking-wide truncate mt-0.5"
                style={{ color: modeColor, textShadow: `1px 1px 0 #0b1530` }}
              >
                {t(`blast.themes.${theme}`, theme)}
              </span>
            )}
          </div>
        </div>
        <CoinDisplay coins={coins} modeColor={modeColor} />
        <BlastChestBadge
          chestNumber={chestNumber}
          progress={chestProgress}
          contents={chestContents}
          modeColor={modeColor}
          onPreview={() => setShowPreview(true)}
        />
      </div>
      {chestContents && (
        <BlastChestPreviewModal
          chestNumber={chestNumber}
          contents={chestContents}
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
        />
      )}
      {(mech.revealLetterHint || mech.revealWordHint) && (
        <div className="flex items-center justify-center gap-3 px-4 py-2">
          <button
            onClick={onHint}
            data-testid="hint-btn"
            className="px-4 py-2 rounded-md font-bold text-[#0b1530] transition-transform active:scale-95"
            style={{
              background: 'white',
              boxShadow: `2px 2px 0 #0b1530`,
            }}
          >
            {t('blast.hint', 'Hint')}
          </button>
        </div>
      )}
    </>
  );
}
