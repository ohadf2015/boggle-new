'use client';
import { useState } from 'react';
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

export function BlastHud({
  levelNumber,
  coins,
  chestNumber,
  chestProgress,
  chestContents,
  onShuffle,
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
        className="relative flex items-center justify-between gap-3 px-4 py-3 bg-[#0b1530] text-white"
        style={{
          // Theme-tinted gradient sweep across HUD background so each level
          // reads as its own mode (lime/cyan/pink/purple). Subtle — keeps
          // contrast on the white-faced tiles.
          backgroundImage: `linear-gradient(90deg, rgba(11,21,48,1) 0%, color-mix(in srgb, ${modeColor} 14%, #0b1530) 50%, rgba(11,21,48,1) 100%)`,
          boxShadow: `inset 0 -2px 0 ${modeColor}`,
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            aria-hidden
            className="inline-block w-2 h-7 rounded-sm shrink-0"
            style={{ background: modeColor, boxShadow: `0 0 12px ${modeColor}` }}
          />
          <div className="flex flex-col leading-tight min-w-0">
            <span
              data-testid="level-label"
              className="text-[11px] font-bold uppercase tracking-wider opacity-70"
            >
              {t('blast.level', `Level ${levelNumber}`, { n: String(levelNumber) })}
            </span>
            {theme && (
              <span
                data-testid="theme-label"
                className="text-sm font-black uppercase tracking-wide truncate"
                style={{ color: modeColor, textShadow: `1px 1px 0 #0b1530` }}
              >
                {t(`blast.themes.${theme}`, theme)}
              </span>
            )}
          </div>
        </div>
        <span
          data-testid="coin-counter"
          className="text-base font-semibold tabular-nums px-3 py-1 rounded-md"
          style={{
            background: 'rgba(0,0,0,0.35)',
            border: `1px solid color-mix(in srgb, ${modeColor} 50%, transparent)`,
          }}
        >
          🪙 {coins}
        </span>
        <BlastChestBadge
          chestNumber={chestNumber}
          progress={chestProgress}
          contents={chestContents}
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
      {(mech.shuffleButton || mech.revealLetterHint || mech.revealWordHint) && (
        <div className="flex items-center justify-center gap-3 px-4 py-2">
          {mech.shuffleButton && (
            <button
              onClick={onShuffle}
              data-testid="shuffle-btn"
              className="px-4 py-2 rounded-md font-bold text-[#0b1530] transition-transform active:scale-95"
              style={{
                background: modeColor,
                boxShadow: `2px 2px 0 #0b1530`,
              }}
            >
              {t('blast.shuffle', 'Shuffle')}
            </button>
          )}
          {(mech.revealLetterHint || mech.revealWordHint) && (
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
          )}
        </div>
      )}
    </>
  );
}
