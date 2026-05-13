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
};

export function BlastHud({
  levelNumber,
  coins,
  chestNumber,
  chestProgress,
  chestContents,
  onShuffle,
  onHint,
}: Props) {
  const { t } = useLanguage();
  const mech = mechanicsForLevel(levelNumber);
  const [showPreview, setShowPreview] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-[#0b1530] text-white border-b border-white/10">
        <span
          data-testid="level-label"
          className="text-sm font-bold uppercase tracking-wide opacity-90"
        >
          {t('blast.level', `Level ${levelNumber}`, { n: String(levelNumber) })}
        </span>
        <span
          data-testid="coin-counter"
          className="text-sm font-semibold tabular-nums"
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
      <div className="flex items-center justify-center gap-4 px-4 py-2">
        {mech.shuffleButton && (
          <button
            onClick={onShuffle}
            data-testid="shuffle-btn"
            className="px-3 py-2 border-2 border-[#0b1530] rounded-md bg-white"
          >
            {t('blast.shuffle', 'Shuffle')}
          </button>
        )}
        {(mech.revealLetterHint || mech.revealWordHint) && (
          <button
            onClick={onHint}
            data-testid="hint-btn"
            className="px-3 py-2 border-2 border-[#0b1530] rounded-md bg-white"
          >
            {t('blast.hint', 'Hint')}
          </button>
        )}
      </div>
    </>
  );
}
