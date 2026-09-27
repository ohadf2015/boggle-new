'use client';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ChestContents } from '@/lib/blast/v2/chest-roll';

type Props = {
  chestNumber: number;
  contents: ChestContents;
  isOpen: boolean;
  onClose: () => void;
};

export function BlastChestPreviewModal({ chestNumber, contents, isOpen, onClose }: Props) {
  const { t } = useLanguage();

  if (!isOpen) return null;

  return (
    <div
      data-testid="preview-modal"
      className="fixed inset-0 bg-[#0b1530]/80 grid place-items-center"
      onClick={onClose}
    >
      <div
        className="bg-white text-[#0b1530] p-8 rounded-lg border-4 border-[#0b1530] max-w-sm space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold">
          {t('blast.chest.preview', `Chest #${chestNumber}`, { n: String(chestNumber) })}
        </h2>
        <div className="space-y-2 text-lg">
          <p className="font-bold capitalize">
            {contents.tier} {t('blast.chest.tier.label', 'Tier')}
          </p>
          <p>
            {contents.coins} {t('blast.chest.coins', 'Coins')}
          </p>
          {contents.boosts.length > 0 && (
            <ul className="list-disc list-inside">
              {contents.boosts.map((b, i) => (
                <li key={i}>
                  {b.count}x {b.type}
                </li>
              ))}
            </ul>
          )}
          {contents.avatarPart && <p>{contents.avatarPart}</p>}
        </div>
        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-[#0b1530] text-white rounded-md"
        >
          {t('blast.close', 'Close')}
        </button>
      </div>
    </div>
  );
}
