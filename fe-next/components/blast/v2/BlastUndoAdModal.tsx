'use client';
import { m, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';

type Props = {
  isOpen: boolean;
  modeColor?: string;
  /** Fires when the player accepts the rewarded-ad offer. */
  onWatchAd: () => void;
  /** Fires when the player dismisses without watching. */
  onCancel: () => void;
};

/**
 * Confirmation modal shown when the player tries to undo past the two free
 * moves. The actual rewarded-ad call lives in BlastGame so this component
 * stays presentational — easier to test, no Capacitor dependency at the leaf.
 */
export function BlastUndoAdModal({ isOpen, modeColor = '#06b6d4', onWatchAd, onCancel }: Props) {
  const { t } = useLanguage();
  return (
    <AnimatePresence>
      {isOpen && (
        <m.div
          data-testid="blast-undo-ad-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-6"
          onClick={onCancel}
        >
          <m.div
            initial={{ scale: 0.85, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.85, y: 16 }}
            transition={{ type: 'spring', stiffness: 320, damping: 22 }}
            className="max-w-sm w-full rounded-2xl bg-[#0b1530] text-white p-6 flex flex-col items-center gap-4"
            style={{
              border: `3px solid ${modeColor}`,
              boxShadow: `0 8px 30px rgba(0,0,0,0.6), 0 0 24px color-mix(in srgb, ${modeColor} 40%, transparent)`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div aria-hidden className="text-4xl">↶</div>
            <h2 className="text-xl font-black text-center" style={{ color: modeColor }}>
              {t('blast.undoAdGate.title', 'More undos?')}
            </h2>
            <p className="text-sm text-white text-center leading-relaxed">
              {t(
                'blast.undoAdGate.body',
                'Watch a short ad to keep reversing moves. Your first two undos each level are always free.',
              )}
            </p>
            <div className="flex flex-col w-full gap-2 mt-2">
              <button
                data-testid="blast-undo-ad-watch"
                onClick={onWatchAd}
                className="w-full px-5 py-3 rounded-lg font-bold text-[#0b1530] transition-transform active:scale-95"
                style={{ background: modeColor, boxShadow: `2px 2px 0 #0b1530` }}
              >
                {t('blast.undoAdGate.watch', 'Watch ad')}
              </button>
              <button
                data-testid="blast-undo-ad-cancel"
                onClick={onCancel}
                className="w-full px-5 py-2 rounded-lg font-medium text-white hover:text-white transition-colors"
              >
                {t('blast.undoAdGate.cancel', 'Not now')}
              </button>
            </div>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
