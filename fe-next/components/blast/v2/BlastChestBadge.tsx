'use client';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ChestContents } from '@/lib/blast/v2/chest-roll';

type Props = {
  chestNumber: number;
  progress: number; // 0-1
  contents: ChestContents | null;
  onPreview: () => void;
};

export function BlastChestBadge({ chestNumber, progress, contents, onPreview }: Props) {
  const { t } = useLanguage();
  const percent = Math.round(progress * 100);

  return (
    <button
      onClick={onPreview}
      data-testid="chest-badge"
      className="rounded-lg border-2 border-[#0b1530] bg-[#1a1a2e] text-white px-3 py-2 text-xs space-y-1"
    >
      <div className="font-bold">
        {t('blast.chest.title', `Chest #${chestNumber}`, { n: String(chestNumber) })}
      </div>
      <div className="w-20 h-2 bg-[#333] border border-white">
        <div className="h-full bg-[#BFFF00]" style={{ width: `${percent}%` }} />
      </div>
      <div className="text-xs opacity-70">
        {t(`blast.chest.tier.${contents?.tier ?? 'wood'}`, contents?.tier ?? 'Wood')} · {percent}%
      </div>
      {contents && (
        <div className="text-xs space-y-0.5">
          <div>+{contents.coins} coins</div>
          {contents.boosts.length > 0 && <div>+{contents.boosts.length} boost</div>}
          {contents.avatarPart && <div>+1 avatar part</div>}
        </div>
      )}
    </button>
  );
}
