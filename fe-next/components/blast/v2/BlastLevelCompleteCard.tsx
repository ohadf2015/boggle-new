'use client';
import { m } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';

type Props = {
  coins: number;
  cascadeCount: number;
  modeColor?: string;
  levelNumber?: number;
  onNext: () => void;
};

// Bigger, theme-tinted result card. Spring entrance + staggered stat reveal
// so the moment feels earned. Theme color drives the title, border accent,
// and the primary CTA — keeping each mode visually distinct.
export function BlastLevelCompleteCard({
  coins,
  cascadeCount,
  modeColor = '#BFFF00',
  levelNumber,
  onNext,
}: Props) {
  const { t } = useLanguage();
  return (
    <div
      data-testid="complete-card"
      className="relative grid place-items-center min-h-dvh overflow-hidden text-white"
      style={{
        background: `radial-gradient(ellipse 70% 60% at 50% 40%, color-mix(in srgb, ${modeColor} 22%, #0b1530) 0%, #0b1530 70%)`,
      }}
    >
      <m.div
        initial={{ scale: 0.5, opacity: 0, rotate: -3 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 18 }}
        className="relative max-w-md w-[88%] px-8 py-10 rounded-2xl text-center"
        style={{
          background: '#16213e',
          border: `3px solid ${modeColor}`,
          boxShadow: `6px 6px 0 #0b1530, 0 0 60px color-mix(in srgb, ${modeColor} 35%, transparent)`,
        }}
      >
        {levelNumber !== undefined && (
          <m.div
            initial={{ y: -8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="text-xs uppercase tracking-[0.2em] opacity-70"
          >
            {t('blast.level', `Level ${levelNumber}`, { n: String(levelNumber) })}
          </m.div>
        )}
        <m.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.25, type: 'spring', stiffness: 400 }}
          className="text-5xl font-black mt-2"
          style={{ color: modeColor, textShadow: `3px 3px 0 #0b1530` }}
        >
          {t('blast.complete.title', 'Level Complete!')}
        </m.div>
        <m.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="mt-8 grid grid-cols-2 gap-3"
        >
          <div className="rounded-lg p-3 bg-black/30 border border-white/10">
            <div className="text-3xl font-bold">🪙</div>
            <div className="text-2xl font-bold tabular-nums">+{coins}</div>
            <div className="text-[10px] uppercase tracking-wider opacity-60 mt-1">
              {t('blast.complete.coins', 'Coins')}
            </div>
          </div>
          <div className="rounded-lg p-3 bg-black/30 border border-white/10">
            <div className="text-3xl font-bold">⚡</div>
            <div className="text-2xl font-bold tabular-nums">{cascadeCount}</div>
            <div className="text-[10px] uppercase tracking-wider opacity-60 mt-1">
              {t('blast.complete.cascadesLabel', 'Cascades')}
            </div>
          </div>
        </m.div>
        <m.button
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.65, type: 'spring', stiffness: 320 }}
          whileTap={{ scale: 0.96 }}
          onClick={onNext}
          className="mt-8 px-8 py-3 w-full rounded-lg font-black text-lg uppercase tracking-wide"
          style={{
            background: modeColor,
            color: '#0b1530',
            boxShadow: `4px 4px 0 #0b1530`,
          }}
          data-testid="next-btn"
        >
          {t('blast.complete.next', 'Next Level')} →
        </m.button>
      </m.div>
    </div>
  );
}
