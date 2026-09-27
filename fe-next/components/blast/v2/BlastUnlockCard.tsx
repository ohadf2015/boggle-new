'use client';
import { m, useReducedMotion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import type { MechanicKey } from '@/lib/blast/v2/tutorial/unlocks-seen';
import { getCardForMechanic } from '@/lib/blast/v2/tutorial/mechanic-cards';

type Props = {
  mechanic: MechanicKey;
  cardIndex: number;
  onDismiss: () => void;
  onSkipAll?: () => void;
};

export function BlastUnlockCard({ mechanic, cardIndex, onDismiss, onSkipAll }: Props) {
  const { t } = useLanguage();
  const card = getCardForMechanic(mechanic);
  const reducedMotion = useReducedMotion();
  const showSkipLink = cardIndex > 0;

  return (
    <m.div
      initial={{
        opacity: reducedMotion === true ? 1 : 0,
        scale: reducedMotion === true ? 1 : 0.9,
      }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 flex items-center justify-center bg-black/50 z-40"
    >
      <m.div
        className="bg-[#0b1530] border-neo-thick border-black rounded-neo p-8 max-w-sm space-y-4 text-white"
        animate={{ y: 0 }}
      >
        <div className="text-4xl text-center">{card.iconAsset}</div>
        <h2 className="text-xl font-bold text-center">
          {t(card.titleKey, `NEW: ${mechanic}`)}
        </h2>
        <p className="text-sm text-center opacity-90">
          {t(card.bodyKey, 'A new mechanic has been unlocked')}
        </p>
        <button
          type="button"
          onClick={onDismiss}
          className="w-full px-4 py-3 bg-neo-pink border-neo-thick border-black rounded-neo font-bold text-center"
          data-testid="unlock-card-got-it"
        >
          {t('blast.tutorial.unlock.gotIt', 'Got it')}
        </button>
        {showSkipLink && (
          <button
            type="button"
            onClick={() => onSkipAll?.()}
            className="text-xs text-center opacity-70 hover:opacity-100 transition-opacity w-full"
            data-testid="unlock-card-skip-all"
          >
            {t('blast.tutorial.unlock.skipFuture', 'Skip future tutorials')}
          </button>
        )}
      </m.div>
    </m.div>
  );
}
