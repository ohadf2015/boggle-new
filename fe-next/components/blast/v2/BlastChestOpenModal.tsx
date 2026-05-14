'use client';
import { m } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ChestContents } from '@/lib/blast/v2/chest-roll';

type Props = {
  contents: ChestContents;
  isOpen: boolean;
  onClose: () => void;
};

export function BlastChestOpenModal({ contents, isOpen, onClose }: Props) {
  const { t } = useLanguage();

  if (!isOpen) return null;

  return (
    <div
      data-testid="chest-modal"
      className="fixed inset-0 bg-[#0b1530]/95 grid place-items-center"
    >
      <m.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`space-y-6 text-center text-white p-8 rounded-lg border-4 border-white chest-tier-${contents.tier}`}
      >
        <h2 className="text-4xl font-bold">
          {t('blast.chest.opened', 'Chest Opened!', { tier: contents.tier })}
        </h2>

        <m.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="text-6xl font-bold text-[#BFFF00]">{contents.coins}</div>
          <div className="text-lg">{t('blast.chest.coins', 'Coins')}</div>
        </m.div>

        {contents.boosts.length > 0 && (
          <m.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <div className="space-y-1">
              {contents.boosts.map((b, i) => (
                <div key={i} className="text-lg">
                  +{b.count} {b.type}
                </div>
              ))}
            </div>
          </m.div>
        )}

        {contents.avatarPart && (
          <m.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.9 }}
          >
            <div className="text-lg">+1 {contents.avatarPart}</div>
          </m.div>
        )}

        <button
          onClick={onClose}
          data-testid="chest-close-btn"
          className="px-6 py-3 bg-[#ec4899] border-3 border-white rounded-lg font-bold text-lg"
        >
          {t('blast.chest.continue', 'Continue')}
        </button>
      </m.div>

      <style>{`
        .chest-tier-wood { background: #8b6f47; }
        .chest-tier-silver { background: #c0c0c0; }
        .chest-tier-gold { background: #ffd700; color: #0b1530; }
        .chest-tier-legendary { background: #ff1493; box-shadow: 0 0 30px #ff1493; }
      `}</style>
    </div>
  );
}
