'use client';
import { mechanicsForLevel } from '@/lib/blast/v2/mechanic-flags';
import { useLanguage } from '@/contexts/LanguageContext';

type Props = {
  levelNumber: number;
  coins: number;
  chestProgress: number;
  onShuffle: () => void;
  onHint: () => void;
};

export function BlastHud({ levelNumber, coins, chestProgress, onShuffle, onHint }: Props) {
  const { t } = useLanguage();
  const mech = mechanicsForLevel(levelNumber);
  return (
    <>
      <div className="flex items-center justify-between px-4 py-2 bg-[#0b1530] text-white">
        <span data-testid="level-label">
          {t('blast.level', `Level ${levelNumber}`, { n: String(levelNumber) })}
        </span>
        <span data-testid="coin-counter">🪙 {coins}</span>
        <div data-testid="chest-pill" className="rounded-md border-2 border-white px-2 py-1 text-xs">
          {t('blast.chest.pill', 'Chest #1')} {Math.round(chestProgress * 100)}%
        </div>
      </div>
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
