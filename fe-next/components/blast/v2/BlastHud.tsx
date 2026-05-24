'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { m, useMotionValue, animate } from 'framer-motion';
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
  modeColor?: string;
  theme?: string;
  // Theme target words for this level (in chain order). Renders as a list of
  // chips below the HUD so players see their progress as they play. Optional
  // so old call sites keep working.
  targetWords?: string[];
  foundWords?: string[];
  // Count of off-theme dictionary words the player has discovered this level.
  // Surfaced as a chip so free-form "bonus word" hunting feels rewarded
  // (Wordscapes-style) even though it's never required to finish a level.
  bonusWordCount?: number;
  // Reverse-move support: when canUndo is true the HUD renders an Undo button
  // beside the hint button. Lets players rewind a misplaced clear so they
  // never get stuck mid-level.
  canUndo?: boolean;
  onUndo?: () => void;
};

// Animated coin counter — pops to scale 1.18 on increment, eases back to 1.
// Independent of the chest progress bar so the two reactions don't visually
// fight when both fire at the same time after a word commit.
function CoinDisplay({ coins, modeColor }: { coins: number; modeColor: string }) {
  const mv = useMotionValue(coins);
  // Render via React state synced from the MotionValue. The earlier pattern
  // (`<m.span>{useTransform(...)}</m.span>`) crashed under React 19 / current
  // framer with "Objects are not valid as a React child" because the transform
  // returns a MotionValue<string> instance, not a string. Subscribing via
  // mv.on('change') keeps the smooth tween while passing a real string child.
  const [display, setDisplay] = useState(() => Math.round(coins).toLocaleString());
  const scale = useMotionValue(1);
  const prev = useRef(coins);

  useEffect(() => {
    const unsub = mv.on('change', (v: number) => setDisplay(Math.round(v).toLocaleString()));
    return unsub;
  }, [mv]);

  useEffect(() => {
    if (prev.current === coins) return;
    const ctrl = animate(mv, coins, { duration: 0.45, ease: 'easeOut' });
    const pop = animate(scale, [1, 1.22, 1], { duration: 0.5, ease: 'easeOut' });
    prev.current = coins;
    return () => {
      ctrl.stop();
      pop.stop();
    };
  }, [coins, mv, scale]);

  return (
    <m.div
      data-testid="coin-counter"
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-black text-base tabular-nums"
      style={{
        scale,
        background: 'rgba(0,0,0,0.45)',
        border: `2px solid ${modeColor}`,
        boxShadow: `2px 2px 0 0 #0b1530, 0 0 14px color-mix(in srgb, ${modeColor} 50%, transparent)`,
        color: '#fff',
        textShadow: `1px 1px 0 #0b1530`,
      }}
    >
      <span aria-hidden style={{ filter: 'drop-shadow(0 0 4px #fbbf24)' }}>🪙</span>
      <span>{display}</span>
    </m.div>
  );
}

export function BlastHud({
  levelNumber,
  coins,
  chestNumber,
  chestProgress,
  chestContents,
  onShuffle: _onShuffle,
  onHint,
  modeColor = '#BFFF00',
  theme,
  targetWords,
  foundWords,
  bonusWordCount = 0,
  canUndo = false,
  onUndo,
}: Props) {
  const { t } = useLanguage();
  const mech = mechanicsForLevel(levelNumber);
  const [showPreview, setShowPreview] = useState(false);
  const foundSet = useMemo(() => {
    if (!foundWords) return new Set<string>();
    return new Set(foundWords.map((w) => w.toUpperCase()));
  }, [foundWords]);

  return (
    <>
      <div
        className="relative flex items-center justify-between gap-2 px-3 py-2.5 bg-[#0b1530] text-white"
        style={{
          // Theme-tinted gradient sweep across HUD background so each level
          // reads as its own mode (lime/cyan/pink/purple). Subtle — keeps
          // contrast on the white-faced tiles.
          backgroundImage: `linear-gradient(90deg, rgba(11,21,48,1) 0%, color-mix(in srgb, ${modeColor} 22%, #0b1530) 50%, rgba(11,21,48,1) 100%)`,
          boxShadow: `inset 0 -3px 0 ${modeColor}, 0 4px 12px rgba(0,0,0,0.4)`,
        }}
      >
        <div
          className="flex items-center gap-2 min-w-0 px-2.5 py-1 rounded-lg"
          style={{
            background: 'rgba(0,0,0,0.35)',
            border: `2px solid color-mix(in srgb, ${modeColor} 60%, transparent)`,
            boxShadow: `2px 2px 0 0 #0b1530`,
          }}
        >
          <span
            aria-hidden
            className="inline-block w-2.5 h-8 rounded-sm shrink-0"
            style={{ background: modeColor, boxShadow: `0 0 14px ${modeColor}` }}
          />
          <div className="flex flex-col leading-none min-w-0">
            <span
              data-testid="level-label"
              className="text-[10px] font-bold uppercase tracking-wider opacity-70"
            >
              {t('blast.level', `Level ${levelNumber}`, { n: String(levelNumber) })}
            </span>
            {theme && (
              <span
                data-testid="theme-label"
                className="text-base font-black uppercase tracking-wide truncate mt-0.5"
                style={{ color: modeColor, textShadow: `1px 1px 0 #0b1530` }}
              >
                {t(`blast.themes.${theme}`, theme)}
              </span>
            )}
          </div>
        </div>
        <CoinDisplay coins={coins} modeColor={modeColor} />
        <BlastChestBadge
          chestNumber={chestNumber}
          progress={chestProgress}
          contents={chestContents}
          modeColor={modeColor}
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
      {targetWords && targetWords.length > 0 && (
        <div
          data-testid="hud-words-strip"
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 flex-wrap bg-[#0b1530]/80"
          style={{ borderBottom: `1px solid color-mix(in srgb, ${modeColor} 25%, transparent)` }}
        >
          {targetWords.map((w) => {
            const upper = w.toUpperCase();
            const isFound = foundSet.has(upper);
            return (
              <m.span
                key={upper}
                data-testid={`hud-word-${upper}`}
                data-found={isFound}
                initial={false}
                animate={{ scale: isFound ? [1, 1.18, 1] : 1 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="text-[10px] font-black uppercase tracking-wider rounded-md px-2 py-0.5"
                style={{
                  background: isFound ? modeColor : 'rgba(255,255,255,0.08)',
                  color: isFound ? '#0b1530' : 'rgba(255,255,255,0.55)',
                  textDecoration: isFound ? 'none' : 'none',
                  letterSpacing: isFound ? '0.05em' : '0.15em',
                  boxShadow: isFound ? `0 0 8px color-mix(in srgb, ${modeColor} 60%, transparent)` : 'none',
                  // Mask letters until found — so the puzzle is still a puzzle.
                  filter: isFound ? 'none' : 'blur(0px)',
                }}
              >
                {isFound ? upper : upper.replace(/./g, '•')}
              </m.span>
            );
          })}
          {bonusWordCount > 0 && (
            <m.span
              data-testid="hud-bonus-count"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: [1, 1.18, 1], opacity: 1 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="text-[10px] font-black uppercase tracking-wider rounded-md px-2 py-0.5"
              style={{
                background: 'rgba(255,255,255,0.08)',
                color: modeColor,
                border: `1px solid color-mix(in srgb, ${modeColor} 45%, transparent)`,
              }}
            >
              {t('blast.feedback.bonusCount', `⭐ ${bonusWordCount} bonus`, {
                count: String(bonusWordCount),
              })}
            </m.span>
          )}
        </div>
      )}
      {((mech.revealLetterHint || mech.revealWordHint) || (canUndo && onUndo)) && (
        <div className="flex items-center justify-center gap-3 px-4 py-2">
          {canUndo && onUndo && (
            <button
              onClick={onUndo}
              data-testid="undo-btn"
              aria-label={t('blast.undoTooltip', 'Reverse last move')}
              className="px-4 py-2 rounded-md font-bold text-[#0b1530] transition-transform active:scale-95 inline-flex items-center gap-1.5"
              style={{
                background: modeColor,
                boxShadow: `2px 2px 0 #0b1530`,
              }}
            >
              <span aria-hidden>↶</span>
              {t('blast.undo', 'Undo')}
            </button>
          )}
          {(mech.revealLetterHint || mech.revealWordHint) && (
            <button
              onClick={onHint}
              data-testid="hint-btn"
              className="px-4 py-2 rounded-md font-bold text-[#0b1530] transition-transform active:scale-95"
              style={{
                background: 'white',
                boxShadow: `2px 2px 0 #0b1530`,
              }}
            >
              {t('blast.hint.label', 'Hint')}
            </button>
          )}
        </div>
      )}
    </>
  );
}
