'use client';
import { m } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';

type Props = {
  coins: number;
  cascadeCount: number;
  modeColor?: string;
  levelNumber?: number;
  wordsFound?: number;
  timeSeconds?: number;
  gemsCollected?: number;
  bestChainDepth?: number;
  stars?: number;
  onNext: () => void;
};

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Bigger, theme-tinted result card. Spring entrance + staggered stat reveal
// so the moment feels earned. Theme color drives the title, border accent,
// and the primary CTA — keeping each mode visually distinct.
export function BlastLevelCompleteCard({
  coins,
  cascadeCount,
  modeColor = '#BFFF00',
  levelNumber,
  wordsFound,
  timeSeconds,
  gemsCollected,
  bestChainDepth,
  stars,
  onNext,
}: Props) {
  const { t } = useLanguage();
  const showWords = typeof wordsFound === 'number' && wordsFound > 0;
  const showTime = typeof timeSeconds === 'number' && timeSeconds > 0;
  const showGems = typeof gemsCollected === 'number' && gemsCollected > 0;
  const showChain = typeof bestChainDepth === 'number' && bestChainDepth > 0;
  const showStars = typeof stars === 'number' && stars > 0;
  // Stat tiles are rendered as a flex-wrap so 4–6 stats lay out cleanly on
  // narrow phones without overflowing the card.
  const tiles: Array<{ icon: string; value: string; label: string; key: string }> = [
    { icon: '🪙', value: `+${coins}`, label: t('blast.complete.coins', 'Coins'), key: 'coins' },
    { icon: '⚡', value: String(cascadeCount), label: t('blast.complete.cascadesLabel', 'Cascades'), key: 'cascades' },
  ];
  if (showWords) tiles.push({ icon: '📖', value: String(wordsFound), label: t('blast.complete.wordsLabel', 'Words'), key: 'words' });
  if (showTime) tiles.push({ icon: '⏱️', value: formatTime(timeSeconds!), label: t('blast.complete.timeLabel', 'Time'), key: 'time' });
  if (showGems) tiles.push({ icon: '💎', value: String(gemsCollected), label: t('blast.complete.gemsLabel', 'Gems'), key: 'gems' });
  if (showChain) tiles.push({ icon: '🔥', value: `x${bestChainDepth}`, label: t('blast.complete.chainLabel', 'Best Chain'), key: 'chain' });

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
        className="relative max-w-md w-[92%] px-6 py-8 rounded-2xl text-center"
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
          className="text-4xl font-black mt-2"
          style={{ color: modeColor, textShadow: `3px 3px 0 #0b1530` }}
        >
          {t('blast.complete.title', 'Level Complete!')}
        </m.div>
        {showStars && (
          <m.div
            data-testid="complete-stars"
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.4, type: 'spring', stiffness: 360 }}
            className="mt-3 text-2xl tracking-widest"
            aria-label={`${stars} stars`}
          >
            {Array.from({ length: 3 }).map((_, i) => (
              <span key={i} style={{ opacity: i < stars! ? 1 : 0.25 }}>★</span>
            ))}
          </m.div>
        )}
        <m.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 flex flex-wrap justify-center gap-2"
        >
          {tiles.map((tile, i) => (
            <m.div
              key={tile.key}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.55 + i * 0.06, type: 'spring', stiffness: 380 }}
              data-stat={tile.key}
              className="rounded-lg p-3 bg-black/30 border border-white/10 min-w-[88px] grow basis-[28%]"
            >
              <div className="text-2xl leading-none">{tile.icon}</div>
              <div className="text-xl font-bold tabular-nums mt-1">{tile.value}</div>
              <div className="text-[10px] uppercase tracking-wider opacity-60 mt-1">
                {tile.label}
              </div>
            </m.div>
          ))}
        </m.div>
        <m.button
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.55 + tiles.length * 0.06 + 0.1, type: 'spring', stiffness: 320 }}
          whileTap={{ scale: 0.96 }}
          onClick={onNext}
          className="mt-7 px-8 py-3 w-full rounded-lg font-black text-lg uppercase tracking-wide"
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
