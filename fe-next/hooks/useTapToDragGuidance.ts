'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import {
  shouldShowGuidance,
  markGuidanceShown,
} from '../utils/contextualGuidanceStorage';

interface TappedCellPosition {
  row: number;
  col: number;
  letter: string;
}

interface UseTapToDragGuidanceReturn {
  /** Whether the drag tutorial tooltip should be shown */
  showDragTutorial: boolean;
  /** The cell that was tapped (for positioning the tooltip) */
  tappedCell: TappedCellPosition | null;
  /** Dismiss the tutorial and mark as seen */
  dismissDragTutorial: () => void;
  /** Called when user taps a single cell without dragging */
  handleSingleTapDetected: (cell: TappedCellPosition) => void;
  /** Called when user successfully drags (forms multi-letter word) */
  markUserDragged: () => void;
}

/**
 * useTapToDragGuidance
 *
 * Manages the tap-to-drag tutorial tooltip that appears when mobile users
 * tap a single letter without dragging. Shows only once per user.
 *
 * Usage:
 * 1. Call handleSingleTapDetected when user taps and releases a single cell
 * 2. Call markUserDragged when user successfully drags across cells
 * 3. Render TapToDragTooltip when showDragTutorial is true
 */
export function useTapToDragGuidance(): UseTapToDragGuidanceReturn {
  const [showDragTutorial, setShowDragTutorial] = useState(false);
  const [tappedCell, setTappedCell] = useState<TappedCellPosition | null>(null);

  // Prevent multiple triggers per session
  const triggeredRef = useRef(false);
  // Track if user has successfully dragged during this session
  const hasDraggedRef = useRef(false);

  const handleSingleTapDetected = useCallback((cell: TappedCellPosition) => {
    // Don't show if already triggered this session
    if (triggeredRef.current) return;
    // Don't show if user has already successfully dragged this session
    if (hasDraggedRef.current) return;
    // Don't show if already shown before (persisted)
    if (!shouldShowGuidance('dragTutorialShown')) return;

    triggeredRef.current = true;
    setTappedCell(cell);
    setShowDragTutorial(true);
  }, []);

  const dismissDragTutorial = useCallback(() => {
    setShowDragTutorial(false);
    setTappedCell(null);
    markGuidanceShown('dragTutorialShown');
  }, []);

  // Called when user successfully forms a multi-letter word by dragging
  const markUserDragged = useCallback(() => {
    hasDraggedRef.current = true;
    // If tooltip is showing, dismiss it
    if (showDragTutorial) {
      setShowDragTutorial(false);
      setTappedCell(null);
      markGuidanceShown('dragTutorialShown');
    }
  }, [showDragTutorial]);

  // Stable reference: consumed as a dep of handleSingleTap in InGameScreen,
  // which flows to the grid as onSingleTapDetected. A fresh literal each render
  // breaks GridComponent's memo on every parent render (1/s timer tick).
  // Methods are useCallback-stable; state values change only on tutorial show/hide.
  return useMemo(
    () => ({
      showDragTutorial,
      tappedCell,
      dismissDragTutorial,
      handleSingleTapDetected,
      markUserDragged,
    }),
    [showDragTutorial, tappedCell, dismissDragTutorial, handleSingleTapDetected, markUserDragged]
  );
}
