import { memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { getComboColors, type PerformanceMode } from './index';
import GridCellEffects from './GridCellEffects';
import DoubleClickIndicator from './DoubleClickIndicator';
import { getSelectionEscalation, getEscalationBackground, getEscalationShake } from './selectionEscalation';

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
  isEliminated: boolean;
  isHovered: boolean;
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
  currentTier: number;
  selectedCellsLength: number;
  onTouchStart: (e: React.TouchEvent) => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onDoubleClick: (e: React.MouseEvent) => void;
}

const GridCell = memo<GridCellProps>(({
  cell, row, col,
  isSelected, isFirstSelected, isLastSelected, isFading, isFocused,
  isAdjacentHint, isHighlighted, isEliminated, isHovered,
  highlightedOrder, selectionIdx, escalation, shakeOffset,
  effectiveRenderMode, earthquakePhase, getPhaseAnimation,
  comboLevel, escalationCombo, comboColors, reduceMotion, animateOnMount, interactive,
  isSelecting, isDragging, isTypingMode, hintAnimationPhase,
  currentTier, selectedCellsLength,
  onTouchStart, onMouseDown, onDoubleClick,
}) => (
  <motion.div
    key={`${row}-${col}`}
    data-row={row}
    data-col={col}
    data-letter={cell}
    role="gridcell"
    aria-selected={isSelected}
    aria-label={`Row ${row + 1}, Column ${col + 1}: Letter ${cell}`}
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
          : currentTier >= 3 && !isEliminated ? 0.96
          : (isFading ? 1.02 : 1),
        opacity: isSelecting && selectedCellsLength > 0 && !isSelected && !isAdjacentHint && !isHighlighted ? 0.4 : 1,
        rotate: isSelected ? ((row + col) % 2 === 0 ? -1.5 : 1.5) : 0,
        y: isSelected ? (escalation?.liftY ?? -2) : 0,
        x: 0,
        rotateX: 0,
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
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan",
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
            : "letter-tile-gradient text-neo-black border-2 border-neo-black/30 shadow-sm hover:shadow-md hover:border-neo-black/50 active:shadow-none",
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
      transition: isSelected
        ? `box-shadow ${escalationCombo > 0 ? 350 : 250}ms ease-out, background ${escalationCombo > 0 ? 300 : 200}ms ease, border-color 200ms ease`
        : 'box-shadow 400ms ease-out, background 350ms ease-out, border-color 300ms ease-out, opacity 150ms ease',
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
      } : isSelected && escalation && escalation.tier >= 1 ? {
        ...getEscalationBackground(selectionIdx, selectedCellsLength, escalationCombo),
        ...(!reduceMotion && getEscalationShake(selectedCellsLength, escalationCombo) ? {
          animation: [
            getEscalationBackground(selectionIdx, selectedCellsLength, escalationCombo).animation,
            getEscalationShake(selectedCellsLength, escalationCombo),
          ].filter(Boolean).join(', '),
        } : {}),
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
      totalSelected={selectedCellsLength}
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
  </motion.div>
));

GridCell.displayName = 'GridCell';

export default GridCell;
