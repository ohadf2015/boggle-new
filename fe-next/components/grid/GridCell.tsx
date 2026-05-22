import { memo } from 'react';
import { m } from 'framer-motion';
import { cn } from '../../lib/utils';
import { getComboColors, type PerformanceMode } from './index';
import GridCellEffects from './GridCellEffects';
import RoundEventTileEffects from './RoundEventTileEffects';
import DoubleClickIndicator from './DoubleClickIndicator';
import { getSelectionEscalation, composeEscalationStyle } from './selectionEscalation';

/** Cell position for highlighted paths */
export interface HighlightedCell {
  row: number;
  col: number;
}

/** Props for memoized grid cell */
export interface GridCellProps {
  cell: string;
  row: number;
  col: number;
  isSelected: boolean;
  isFirstSelected: boolean;
  isLastSelected: boolean;
  isFading: boolean;
  isFocused: boolean;
  isAdjacentHint: boolean;
  isHighlighted: boolean;
  isGolden: boolean;
  isEliminated: boolean;
  isHovered: boolean;
  isFrozen: boolean;
  isCharged: boolean;
  isMeteor: boolean;
  highlightedOrder: number | undefined;
  selectionIdx: number;
  escalation: ReturnType<typeof getSelectionEscalation> | null;
  shakeOffset: { x: number; y: number; rotate: number; scale: number; delay: number };
  effectiveRenderMode: PerformanceMode;
  earthquakePhase: string;
  getPhaseAnimation: Record<string, { animate?: Record<string, unknown>; transition: Record<string, unknown> }>;
  comboLevel: number;
  /** Combo level including cooldown warmth, used for escalation background/shake */
  escalationCombo: number;
  comboColors: ReturnType<typeof getComboColors>;
  reduceMotion: boolean;
  animateOnMount: boolean;
  interactive: boolean;
  isSelecting: boolean;
  isDragging: boolean;
  isTypingMode: boolean;
  hintAnimationPhase: 'blink' | 'fadeout' | null;
  /** True when escalation has crossed tier 3+ — used to apply background-shrink scale.
   * Boolean (not number) so non-selected cells skip re-renders on tier 1→2 transitions. */
  isHighTier: boolean;
  selectedCellsLength: number;
  onTouchStart: (e: React.TouchEvent) => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onDoubleClick: (e: React.MouseEvent) => void;
  /** Ghost mode: invisible cell for touch interaction only (blast mode overlay handles visuals) */
  ghost?: boolean;
  /** Pre-localized aria-label built by parent via `t()` — keeps this memo free of context subscriptions */
  ariaLabel: string;
}

const GridCell = memo<GridCellProps>(({
  cell, row, col,
  isSelected, isFirstSelected, isLastSelected, isFading, isFocused,
  isAdjacentHint, isHighlighted, isGolden, isEliminated, isHovered,
  isFrozen, isCharged, isMeteor,
  highlightedOrder, selectionIdx, escalation, shakeOffset,
  effectiveRenderMode, earthquakePhase, getPhaseAnimation,
  comboLevel, escalationCombo, comboColors, reduceMotion, animateOnMount, interactive,
  isSelecting, isDragging, isTypingMode, hintAnimationPhase,
  isHighTier, selectedCellsLength,
  onTouchStart, onMouseDown, onDoubleClick, ghost = false, ariaLabel,
}) => {
  // Empty cell — render invisible placeholder to maintain grid layout
  if (!cell) {
    return (
      <div
        data-row={row}
        data-col={col}
        role="gridcell"
        aria-hidden="true"
        className="aspect-square rounded-neo"
        style={{ visibility: 'hidden' }}
      />
    );
  }

  // Ghost mode: invisible touch target — BlastTile overlay handles all visuals
  if (ghost) {
    return (
      <div
        data-row={row}
        data-col={col}
        data-letter={cell}
        role="gridcell"
        aria-hidden="true"
        tabIndex={interactive ? 0 : -1}
        onTouchStart={onTouchStart}
        onMouseDown={onMouseDown}
        onDoubleClick={onDoubleClick}
        className="aspect-square"
        style={{ background: 'transparent' }}
      />
    );
  }

  return (
  <m.div
    key={`${row}-${col}`}
    data-row={row}
    data-col={col}
    data-letter={cell}
    role="gridcell"
    aria-selected={isSelected}
    aria-label={ariaLabel}
    tabIndex={interactive ? 0 : -1}
    onTouchStart={onTouchStart}
    onMouseDown={onMouseDown}
    onDoubleClick={onDoubleClick}
    initial={effectiveRenderMode === 'minimal' ? false : (animateOnMount
      ? { scale: 0, opacity: 0, rotateX: -90, y: -20 }
      : false
    )}
    animate={effectiveRenderMode === 'minimal'
      ? { opacity: 1, rotateX: 0 }
      : earthquakePhase !== 'idle' ? (
        earthquakePhase === 'rumble' ? {
          ...getPhaseAnimation.rumble.animate,
          rotateX: 0,
        } : earthquakePhase === 'quake' ? {
          x: shakeOffset.x,
          y: shakeOffset.y,
          rotate: shakeOffset.rotate,
          scale: shakeOffset.scale,
          opacity: 0.8,
          rotateX: 0,
        } : earthquakePhase === 'settle' ? {
          ...getPhaseAnimation.settle.animate,
          rotateX: 0,
        } : {
          x: 0, y: 0, rotate: 0, scale: 1, opacity: 1, rotateX: 0,
        }
      ) : {
        scale: isSelected ? (escalation?.scale ?? 1.05)
          : isHighTier && !isEliminated ? 0.96
          : (isFading ? 1.02 : 1),
        rotate: isSelected ? ((row + col) % 2 === 0 ? -1.5 : 1.5) : 0,
        y: isSelected ? (escalation?.liftY ?? -2) : 0,
        x: 0,
        rotateX: 0,
        opacity: 1,
      }
    }
    whileTap={effectiveRenderMode === 'minimal' ? undefined : { scale: 0.92 }}
    transition={effectiveRenderMode === 'minimal'
      ? { duration: 0 }
      : earthquakePhase !== 'idle' ? (
        earthquakePhase === 'rumble' ? {
          ...getPhaseAnimation.rumble.transition,
          delay: shakeOffset.delay,
        } : earthquakePhase === 'quake' ? {
          ...getPhaseAnimation.quake.transition,
          delay: shakeOffset.delay,
        } : earthquakePhase === 'settle' ? {
          ...getPhaseAnimation.settle.transition,
          delay: shakeOffset.delay,
        } : {
          duration: 0.1,
        }
      ) : isSelected ? {
        type: 'spring',
        stiffness: 600,
        damping: 18,
        mass: 0.6,
      } : {
        type: 'spring',
        stiffness: 200,
        damping: 15,
        delay: reduceMotion ? 0 : (animateOnMount ? (row + col) * 0.03 : 0),
      }
    }
    className={cn(
      "aspect-square flex items-center justify-center font-black cursor-pointer relative overflow-hidden",
      "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-cyan",
      isSelected
        ? comboColors.isRainbow
          ? `${comboColors.textColor || 'text-neo-black'} border-2 border-neo-black/60 z-10`
          : `${comboColors.bg} ${comboColors.textColor || 'text-neo-black'} border-2 border-neo-black/60 z-10`
        : isHighlighted
          ? `bg-neo-lime text-neo-black border-2 border-neo-black/60 z-10 shadow-[0_0_12px_rgba(255,225,53,0.5)] ${
              isTypingMode ? 'animate-keyboard-light-up' :
              hintAnimationPhase === 'blink' ? 'animate-hint-blink' :
              hintAnimationPhase === 'fadeout' ? 'animate-hint-fadeout' :
              ''
            }`
          : isEliminated
            ? "bg-gray-400/60 text-gray-500/50 border border-gray-400/30 shadow-none cursor-not-allowed"
            : "letter-tile-gradient text-neo-black border-2 border-neo-black/30 shadow-xs hover:shadow-md hover:border-neo-black/50 active:shadow-none",
      isGolden && !isSelected && !isEliminated && "golden-tile-bg ring-2 ring-amber-400/80 shadow-[0_0_14px_rgba(255,215,0,0.7)] animate-golden-pulse",
      isFrozen && !isSelected && "ring-2 ring-cyan-300/90 shadow-[0_0_16px_rgba(96,165,250,0.6)] cursor-not-allowed opacity-70",
      isCharged && !isSelected && "ring-2 ring-yellow-300/90 shadow-[0_0_16px_rgba(250,204,21,0.7)] animate-pulse",
      isMeteor && !isSelected && "ring-2 ring-orange-400/90 shadow-[0_0_16px_rgba(251,146,60,0.7)]",
      isAdjacentHint && !isSelected && !isHighlighted && !isEliminated && "ring-2 ring-neo-lime/70 ring-offset-1 ring-offset-neo-cream",
      isHovered && isAdjacentHint && !isSelected && !isHighlighted && !isEliminated && "ring-4 ring-neo-cyan/90 ring-offset-2 scale-105 z-10",
      isHovered && isLastSelected && selectedCellsLength >= 2 && "ring-4 ring-neo-green ring-offset-2 scale-110",
      isSelecting && selectedCellsLength > 0 && !isSelected && !isAdjacentHint && !isHighlighted && "cursor-not-allowed",
      isLastSelected && isSelecting && !isDragging && "animate-anchor-pulse z-20",
      isSelected && !isHovered && "shadow-hard-sm",
      isFocused && !isSelected && "z-20 animate-keyboard-focus"
    )}
    style={{
      borderRadius: '6px',
      fontSize: 'var(--cell-font-size)',
      // Opacity dimming for non-selected cells during selection — driven by CSS transition
      // instead of framer-motion to avoid animation restarts on every re-render
      opacity: isSelecting && selectedCellsLength > 0 && !isSelected && !isAdjacentHint && !isHighlighted ? 0.4 : 1,
      // Short transitions during active drag prevent chained 300ms shadows from
      // stacking into compositor stutter as letters fire 4-6/sec. Restore smooth
      // transitions when idle so selection entrance still feels polished.
      transition: isDragging
        ? 'box-shadow 90ms ease-out, background 80ms linear, border-color 80ms linear, opacity 80ms ease'
        : 'box-shadow 300ms ease-out, background 250ms ease, border-color 200ms ease, opacity 150ms ease',
      // Promote selected/dragging cells to compositor layer — avoids paint reflow
      // when transform scales during drag. Drop the hint when idle to free GPU memory.
      willChange: isSelected || isDragging ? 'transform' : 'auto',
      ...(isSelected && {
        '--esc-scale': String(escalation?.scale ?? 1.05),
        boxShadow: escalation?.glow ?? '0 0 0 2px rgba(255, 225, 53, 0.7), 0 0 8px rgba(255, 200, 100, 0.3)',
        borderColor: escalation?.borderColor,
      } as React.CSSProperties),
      ...(isSelected && comboColors.isRainbow ? {
        background: 'linear-gradient(135deg, #FF3366, #FF6B35, #FFE135, #BFFF00, #00FFFF, #FF1493, #8B5CF6)',
        backgroundSize: '300% 300%',
        animation: reduceMotion ? 'none' : `rainbow-cell ${Math.max(0.4, 2 - (selectedCellsLength - 6) * 0.2)}s ease infinite`
      } : isSelected && comboLevel >= 5 ? {
        background: 'linear-gradient(135deg, #FF6B35, #FF3366, #FF6B35)',
        backgroundSize: '200% 200%',
        animation: 'gradient-x 1.5s ease infinite'
      } : isSelected && comboLevel >= 3 ? {
        background: 'linear-gradient(135deg, #F97316, #EF4444)',
      } : isSelected && comboColors.flicker ? {
        animation: 'flicker 0.1s infinite alternate'
      } : isSelected && escalation && escalation.tier >= 1
        ? composeEscalationStyle(selectionIdx, selectedCellsLength, escalationCombo, reduceMotion)
        : {}),
      ...(isFrozen && !isSelected ? {
        background: 'linear-gradient(135deg, rgba(186,230,253,0.6), rgba(147,197,253,0.4), rgba(186,230,253,0.6))',
        pointerEvents: 'none' as const,
      } : {}),
      ...(isCharged && !isSelected ? {
        background: 'linear-gradient(135deg, rgba(254,240,138,0.5), rgba(253,224,71,0.3), rgba(254,240,138,0.5))',
        backgroundSize: '200% 200%',
        animation: 'gradient-x 2s ease infinite',
      } : {}),
      ...(isMeteor && !isSelected ? {
        background: 'linear-gradient(135deg, rgba(253,186,116,0.5), rgba(251,146,60,0.3), rgba(253,186,116,0.5))',
      } : {}),
      ...(isHighlighted && isTypingMode && highlightedOrder !== undefined ? {
        animationDelay: `${(highlightedOrder - 1) * 50}ms`,
        animationFillMode: 'both',
      } : {})
    }}
  >
    <GridCellEffects
      isSelected={isSelected}
      isFirstSelected={isFirstSelected}
      comboLevel={comboLevel}
      comboColors={comboColors}
      effectiveRenderMode={effectiveRenderMode}
      reduceMotion={reduceMotion}
      selectionIndex={selectionIdx}
      escalation={escalation}
      isDragging={isDragging}
    />

    <span
      className="relative z-10 pointer-events-none select-none"
      style={{
        textShadow: isSelected
          ? comboColors.isRainbow || comboLevel >= 5
            ? '0 2px 4px rgba(0,0,0,0.3)'
            : '0 1px 2px rgba(0,0,0,0.2)'
          : 'none',
      }}
    >
      {cell}
    </span>

    {isGolden && !isEliminated && (
      <>
        <div className="golden-tile-sparkle golden-tile-sparkle--1" />
        <div className="golden-tile-sparkle golden-tile-sparkle--2" />
        <div className="golden-tile-sparkle golden-tile-sparkle--3" />
        <span
          className="absolute top-0 right-0.5 text-[7px] font-black leading-none pointer-events-none select-none z-10 text-amber-900/80 drop-shadow-[0_0_2px_rgba(255,215,0,0.8)]"
          aria-hidden="true"
        >
          ★
        </span>
      </>
    )}

    {/* Round event tile effects (frozen/charged/meteor) */}
    <RoundEventTileEffects
      isFrozen={isFrozen}
      isCharged={isCharged}
      isMeteor={isMeteor}
      isSelected={isSelected}
      row={row}
      col={col}
    />

    {isHighlighted && highlightedOrder !== undefined && (
      <span
        className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-neo-black text-neo-lime text-[10px] font-black rounded-full border-2 border-neo-lime shadow-[0_0_8px_rgba(255,225,53,0.6)]"
        aria-hidden="true"
      >
        {highlightedOrder}
      </span>
    )}

    <DoubleClickIndicator
      visible={isLastSelected && isSelecting && !isDragging && selectedCellsLength >= 2}
    />
  </m.div>
  );
});

GridCell.displayName = 'GridCell';

export default GridCell;
