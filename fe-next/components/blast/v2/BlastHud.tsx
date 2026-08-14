'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { m, useMotionValue, animate } from 'framer-motion';
import { mechanicsForLevel } from '@/lib/blast/v2/mechanic-flags';
import { useLanguage } from '@/contexts/LanguageContext';
import { BlastChestBadge } from './BlastChestBadge';
import { BlastChestPreviewModal } from './BlastChestPreviewModal';
import { themeArt } from '@/lib/blast/v2/themeArt';
import type { ChestContents } from '@/lib/blast/v2/chest-roll';
import { BlastIcon } from './BlastIcon';

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
  // Lose-condition visibility. `strikeBudget` is the max wrong guesses this level
  // tolerates (null/undefined = unlimited, no indicator shown — chill levels);
  // `strikesUsed` is how many have been spent. The HUD renders remaining guesses
  // as pips so a loss is never a surprise (an invisible fail reads as a bug).
  strikeBudget?: number | null;
  strikesUsed?: number;
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
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-neo-display font-black text-lg tabular-nums"
      style={{
        scale,
        background: 'rgba(0,0,0,0.45)',
        border: `2px solid ${modeColor}`,
        boxShadow: `2px 2px 0 0 #0b1530, 0 0 14px color-mix(in srgb, ${modeColor} 50%, transparent)`,
        color: '#fff',
        textShadow: `1px 1px 0 #0b1530`,
      }}
    >
      <BlastIcon src="/blast/icons/coin.svg" size={24} className="drop-shadow-[0_0_4px_#fbbf24]" />
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
  strikeBudget = null,
  strikesUsed = 0,
}: Props) {
  const { t } = useLanguage();
  const mech = mechanicsForLevel(levelNumber);
  const hasStrikes = typeof strikeBudget === 'number' && strikeBudget > 0;
  const strikesRemaining = hasStrikes ? Math.max(0, strikeBudget - strikesUsed) : 0;
  const strikeDanger = hasStrikes && strikesRemaining <= 1;
  const [showPreview, setShowPreview] = useState(false);
  const foundSet = useMemo(() => {
    if (!foundWords) return new Set<string>();
    return new Set(foundWords.map((w) => w.toUpperCase()));
  }, [foundWords]);
  // The target-word strip is a teaching aid: even masked as bullets it leaks the
  // word count and length. Show it only on the first 3 levels, then players hunt
  // the theme words blind. The bonus counter is a reward, not a clue, so it
  // stays visible at every level.
  const showTargetWords = !!targetWords && targetWords.length > 0 && levelNumber <= 3;
  // Theme-word progress. Counts ONLY theme words — foundWords also carries the
  // player's off-theme bonus finds, which would otherwise push the counter past
  // the total. A bare "2/4" leaks the word count but never a letter, so unlike
  // the masked strip above it is safe to show at every level; without it a
  // player past L3 has no read on how much of the level is left.
  const targetTotal = targetWords?.length ?? 0;
  const themeFound = useMemo(
    () => (targetWords ?? []).filter((w) => foundSet.has(w.toUpperCase())).length,
    [targetWords, foundSet],
  );
  const progressPct = targetTotal > 0 ? (themeFound / targetTotal) * 100 : 0;
  // The numeric pill is suppressed on the tutorial levels: the masked strip
  // already shows one chip per word and lights the found ones, so a counter
  // beside it is the same fact twice. The progress BAR still fills — it costs
  // no height and reads at a glance.
  const showProgressPill = targetTotal > 0 && !showTargetWords;
  const showActions = (mech.revealLetterHint || mech.revealWordHint) || (canUndo && !!onUndo);
  // One rail instead of four stacked bands. Every band cost ~28px of board
  // height on a phone, and the board is sized by container query off whatever
  // is left (see BlastBoard's --blast-rows) — so HUD chrome directly shrinks
  // the tiles. Strikes / progress / bonus / actions now share a single row.
  const showRail = hasStrikes || showProgressPill || bonusWordCount > 0 || showActions;

  // Shared pill treatment so the rail reads as one designed component instead
  // of four independently-styled strips.
  const pillStyle = {
    background: 'rgba(0,0,0,0.35)',
    border: `1.5px solid color-mix(in srgb, ${modeColor} 40%, transparent)`,
  } as const;

  return (
    <>
      <div
        className="relative flex items-center justify-between gap-2 px-3 py-2 bg-[#0b1530] text-white"
        style={{
          // Theme-tinted gradient sweep across HUD background so each level
          // reads as its own mode (lime/cyan/pink/purple). Subtle — keeps
          // contrast on the white-faced tiles.
          backgroundImage: `linear-gradient(90deg, rgba(11,21,48,1) 0%, color-mix(in srgb, ${modeColor} 22%, #0b1530) 50%, rgba(11,21,48,1) 100%)`,
          boxShadow: `inset 0 -3px 0 color-mix(in srgb, ${modeColor} 22%, #0b1530), 0 4px 12px rgba(0,0,0,0.4)`,
        }}
      >
        {/* The bar's bottom rule doubles as the level progress meter: it fills
            left-to-right as theme words are cleared. Costs zero extra height,
            which is the whole point of the HUD rework. */}
        <m.div
          aria-hidden
          data-testid="hud-progress-bar"
          className="absolute bottom-0 left-0 h-[3px] rounded-e-full"
          initial={false}
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          style={{ background: modeColor, boxShadow: `0 0 10px ${modeColor}` }}
        />
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
                className="flex items-center gap-1 text-base font-neo-display font-black uppercase tracking-wide truncate mt-0.5"
                style={{ color: modeColor, textShadow: `1px 1px 0 #0b1530` }}
              >
                <BlastIcon src={themeArt(theme)} size={22} />
                <span className="truncate">{t(`blast.themes.${theme}`, theme)}</span>
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
      {showTargetWords && (
        <div
          data-testid="hud-words-strip"
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 flex-wrap bg-[#0b1530]/80"
          style={{ borderBottom: `1px solid color-mix(in srgb, ${modeColor} 25%, transparent)` }}
        >
          {targetWords!.map((w) => {
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
        </div>
      )}
      {showRail && (
        <div
          data-testid="hud-rail"
          className="flex items-center gap-2 px-3 py-1.5 bg-[#0b1530]/85"
          style={{ borderBottom: `1px solid color-mix(in srgb, ${modeColor} 20%, transparent)` }}
        >
          {showProgressPill && (
            <span
              data-testid="hud-progress"
              className="inline-flex items-baseline gap-0.5 rounded-md px-2 py-1 font-neo-display font-black text-xs tabular-nums leading-none"
              style={pillStyle}
              aria-label={t('blast.progress.aria', `${themeFound} of ${targetTotal} words found`, {
                found: String(themeFound),
                total: String(targetTotal),
              })}
            >
              <m.span
                key={themeFound}
                initial={{ scale: 1.4 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                style={{ color: modeColor, display: 'inline-block' }}
              >
                {themeFound}
              </m.span>
              <span className="opacity-45">/{targetTotal}</span>
            </span>
          )}
          {hasStrikes && (
            <span
              data-testid="hud-strikes"
              data-remaining={strikesRemaining}
              data-danger={strikeDanger ? 'true' : 'false'}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 leading-none"
              style={pillStyle}
              aria-label={t('blast.strikes.aria', `${strikesRemaining} guesses left`, {
                count: String(strikesRemaining),
              })}
            >
              {Array.from({ length: strikeBudget }).map((_, i) => {
                // Spend pips from the right so the row drains toward empty.
                const spent = i >= strikesRemaining;
                const liveColor = strikeDanger ? '#FF6B35' : modeColor;
                return (
                  <m.span
                    key={i}
                    data-pip
                    data-spent={spent ? 'true' : 'false'}
                    initial={false}
                    animate={
                      spent
                        ? { scale: [1.5, 1], opacity: 0.22 }
                        : strikeDanger
                          ? { scale: [1, 1.25, 1], opacity: 1 }
                          : { scale: 1, opacity: 1 }
                    }
                    transition={
                      strikeDanger && !spent
                        ? { duration: 0.9, repeat: Infinity, ease: 'easeInOut' }
                        : { duration: 0.3, ease: 'easeOut' }
                    }
                    className="inline-block w-2.5 h-2.5 rounded-[3px]"
                    style={{
                      background: spent ? 'rgba(255,255,255,0.12)' : liveColor,
                      boxShadow: spent ? 'none' : `0 0 6px ${liveColor}`,
                      border: '1.5px solid #0b1530',
                    }}
                  />
                );
              })}
            </span>
          )}
          {bonusWordCount > 0 && (
            <m.span
              data-testid="hud-bonus-count"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: [1, 1.18, 1], opacity: 1 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-black uppercase tracking-wider leading-none"
              style={{ ...pillStyle, color: modeColor }}
            >
              <BlastIcon src="/blast/icons/star.svg" size={12} />
              {t('blast.feedback.bonusCount', `${bonusWordCount} bonus`, {
                count: String(bonusWordCount),
              })}
            </m.span>
          )}
          {/* Actions sit at the trailing edge — `ms-auto` is direction-aware, so
              they land on the right in English and the left in Hebrew. */}
          {showActions && (
            <span className="ms-auto inline-flex items-center gap-2">
              {canUndo && onUndo && (
                <button
                  type="button"
                  onClick={onUndo}
                  data-testid="undo-btn"
                  aria-label={t('blast.undoTooltip', 'Reverse last move')}
                  className="h-8 px-2.5 rounded-md font-bold text-xs text-[#0b1530] transition-transform active:scale-95 inline-flex items-center gap-1"
                  style={{ background: modeColor, boxShadow: '2px 2px 0 #0b1530' }}
                >
                  <span aria-hidden>↶</span>
                  {t('blast.undo', 'Undo')}
                </button>
              )}
              {(mech.revealLetterHint || mech.revealWordHint) && (
                <button
                  type="button"
                  onClick={onHint}
                  data-testid="hint-btn"
                  aria-label={t('blast.hint.revealAria', 'Reveal a word — costs a star')}
                  className="h-8 px-2.5 rounded-md font-bold text-xs text-[#0b1530] transition-transform active:scale-95 inline-flex items-center gap-1"
                  style={{ background: 'white', boxShadow: '2px 2px 0 #0b1530' }}
                >
                  <BlastIcon src="/blast/icons/bulb.svg" size={16} />
                  {t('blast.hint.label', 'Hint')}
                </button>
              )}
            </span>
          )}
        </div>
      )}
    </>
  );
}
