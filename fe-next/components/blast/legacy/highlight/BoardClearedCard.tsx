import { m, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';

export function BoardClearedCard({ finalScore, visible }: { finalScore: number; visible: boolean }) {
  const { t } = useLanguage();
  return (
    <AnimatePresence>
      {visible && (
        <m.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="absolute inset-0 z-[70] flex flex-col items-center justify-center bg-[#1a1a2e]/95 pointer-events-none"
        >
          <div
            style={{
              fontFamily: 'Fredoka, sans-serif',
              fontWeight: 700,
              fontSize: 'clamp(48px, 9vw, 120px)',
              color: '#FAFF00',
              textShadow: '6px 6px 0 #000',
              textTransform: 'uppercase',
            }}
          >
            {t('blast.highlight.boardCleared')}
          </div>
          <div
            style={{
              fontFamily: 'Fredoka, sans-serif',
              fontSize: 'clamp(32px, 5vw, 64px)',
              color: '#FFFFFF',
              marginTop: '16px',
            }}
          >
            {finalScore}
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
