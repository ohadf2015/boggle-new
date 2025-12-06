import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { getDeadzoneThreshold } from '../utils/consts';
import type { LetterGrid, GridPosition } from '@/types';

const noOp = () => { };

// Performance optimization: Detect if device can handle heavy animations
const getPerformanceMode = (): 'full' | 'reduced' | 'minimal' => {
    if (typeof window === 'undefined') return 'full';

    // Check for low-end device indicators
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const hardwareConcurrency = navigator.hardwareConcurrency || 4;
    const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 8;

    // Minimal animations for low-end devices
    if (hardwareConcurrency <= 2 || deviceMemory <= 2) return 'minimal';
    // Reduced animations for mid-range mobile
    if (isMobile && (hardwareConcurrency <= 4 || deviceMemory <= 4)) return 'reduced';

    return 'full';
};

interface CellPosition extends GridPosition {
  letter: string;
  distanceFromCenter: number;
  cellRadius: number;
}

interface SelectedCell extends GridPosition {
  letter: string;
}

interface HeatMapData {
  cellUsageCounts: Record<string, number>;
  maxCount: number;
}

interface GridComponentProps {
  grid: LetterGrid;
  interactive?: boolean;
  onWordSubmit?: (word: string) => void;
  selectedCells?: SelectedCell[];
  className?: string;
  largeText?: boolean;
  comboLevel?: number;
  animateOnMount?: boolean;
  heatMapData?: HeatMapData | null;
}

interface ComboColors {
  bg: string;
  border: string;
  shadow: string;
  text: string | null;
  flicker: boolean;
  textColor?: string;
  isRainbow?: boolean;
  strobe?: boolean;
  intenseStrobe?: boolean;
}

/**
 * GridComponent - Interactive letter grid for word game
 * Memoized to prevent unnecessary re-renders
 *
 * Note: Grid interaction logic extracted to components/grid/useGridInteraction.js
 * Note: Combo colors logic extracted to components/grid/comboColors.js
 */
const GridComponent = memo<GridComponentProps>(({
    grid,
    interactive = false,
    onWordSubmit,
    selectedCells: externalSelectedCells,
    className,
    largeText = false,
    comboLevel = 0,
    animateOnMount = false, // When true, adds a slot machine style cascade animation on initial render
    heatMapData = null // { cellUsageCounts: { "row,col": count }, maxCount: number } for results heat map
}) => {
    const [internalSelectedCells, setInternalSelectedCells] = useState<SelectedCell[]>([]);
    const [fadingCells, setFadingCells] = useState<GridPosition[]>([]); // Track cells that are fading out
    const [reduceMotion, setReduceMotion] = useState(false);
    const [performanceMode, setPerformanceMode] = useState<'full' | 'reduced' | 'minimal'>('full');

    const isTouchingRef = useRef<boolean>(false);
    const gridRef = useRef<HTMLDivElement>(null);
    const startPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const hasMovedRef = useRef<boolean>(false);
    const autoSubmitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const startCellRef = useRef<SelectedCell | null>(null);
    const fadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Use external control if provided, otherwise internal state
    const selectedCells = externalSelectedCells || internalSelectedCells;
    const setSelectedCells = externalSelectedCells ? noOp : setInternalSelectedCells;

    // Auto-focus on grid when game becomes interactive
    useEffect(() => {
        if (interactive && gridRef.current) {
            gridRef.current.focus();
        }
    }, [interactive]);

    // Detect reduced motion preference
    useEffect(() => {
        try {
            const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
            setReduceMotion(!!mq.matches);
            const handler = (e: MediaQueryListEvent) => setReduceMotion(!!e.matches);
            mq.addEventListener?.('change', handler);
            return () => mq.removeEventListener?.('change', handler);
        } catch {
            setReduceMotion(false);
            return undefined;
        }
    }, []);

    // Detect device performance capabilities once on mount
    useEffect(() => {
        setPerformanceMode(getPerformanceMode());
    }, []);

    // Sequential fade-out animation for combo trail
    // Combo trails fade out slower and with more dramatic timing
    // Trail fades from START to END (following the direction of the drag)
    const startSequentialFadeOut = useCallback((isCombo = false) => {
        if (selectedCells.length === 0) return;

        // Cancel any existing fade timeout to prevent clearing new selections
        if (fadeTimeoutRef.current) {
            clearTimeout(fadeTimeoutRef.current);
            fadeTimeoutRef.current = null;
        }

        // Copy selected cells for fading animation
        const cellsToFade = [...selectedCells];
        setFadingCells(cellsToFade);

        // Combo trails stay much longer and fade slower
        // Regular: 80ms between cells, Combo: 120ms between cells
        const cellFadeDelay = isCombo ? 120 : 80;
        // Initial hold time before starting to fade (combo gets extra time to appreciate the trail)
        const initialHold = isCombo ? 500 : 0;

        // Fade out each cell sequentially from START to END (in order of selection)
        // This creates a "following trail" effect in the direction the user dragged
        cellsToFade.forEach((cell, index) => {
            setTimeout(() => {
                setFadingCells(prev => prev.filter(c => !(c.row === cell.row && c.col === cell.col)));
            }, initialHold + index * cellFadeDelay);
        });

        // Clear all selections after animation completes
        // Give extra time for the SVG trail animation to complete (it has its own fade timing)
        const totalDelay = initialHold + cellsToFade.length * cellFadeDelay + (isCombo ? 800 : 200);
        fadeTimeoutRef.current = setTimeout(() => {
            // Only clear if user hasn't started a new selection
            if (!isTouchingRef.current) {
                setSelectedCells([]);
                setFadingCells([]);
            }
            fadeTimeoutRef.current = null;
        }, totalDelay);
    }, [selectedCells, setSelectedCells]);

    // Auto-validation for combo words (only when combo is active)
    useEffect(() => {
        if (!interactive || comboLevel === 0 || selectedCells.length === 0) {
            if (autoSubmitTimeoutRef.current) {
                clearTimeout(autoSubmitTimeoutRef.current);
                autoSubmitTimeoutRef.current = null;
            }
            return;
        }

        // Auto-submit when word reaches minimum valid length (3 letters) during combo
        if (selectedCells.length >= 3) {
            // Clear any existing timeout
            if (autoSubmitTimeoutRef.current) {
                clearTimeout(autoSubmitTimeoutRef.current);
            }

            // Auto-submit after 500ms of no new selection (debounced)
            autoSubmitTimeoutRef.current = setTimeout(() => {
                if (selectedCells.length >= 3 && isTouchingRef.current) {
                    // Trigger submission
                    const formedWord = selectedCells.map(c => c.letter).join('');
                    if (onWordSubmit) {
                        onWordSubmit(formedWord);
                    }

                    // Start sequential fade-out animation (with combo timing)
                    startSequentialFadeOut(true);

                    // End touch/mouse interaction
                    isTouchingRef.current = false;
                }
            }, 500);
        }

        return () => {
            if (autoSubmitTimeoutRef.current) {
                clearTimeout(autoSubmitTimeoutRef.current);
            }
        };
    }, [selectedCells, comboLevel, interactive, onWordSubmit, startSequentialFadeOut]);

    // ==================== Free-Form Selection Helper Functions ====================

    // Check if two cells are adjacent (8 directions including diagonals)
    const isAdjacentCell = (cell1: GridPosition, cell2: GridPosition): boolean => {
        const rowDiff = Math.abs(cell1.row - cell2.row);
        const colDiff = Math.abs(cell1.col - cell2.col);
        return rowDiff <= 1 && colDiff <= 1 && (rowDiff > 0 || colDiff > 0);
    };

    // Selection threshold - must be within this % of cell center to select
    // Higher value = more forgiving selection near cell edges
    const CELL_SELECTION_THRESHOLD = 0.85; // 85% of cell radius

    // Get cell at touch position with cell center distance info
    const getCellAtPosition = useCallback((touchX: number, touchY: number): CellPosition | null => {
        if (!gridRef.current) return null;

        const gridRect = gridRef.current.getBoundingClientRect();
        const cols = grid[0]?.length || 4;
        const rows = grid.length;

        const firstCell = gridRef.current.children[0];
        if (!firstCell) return null;

        const firstCellRect = firstCell.getBoundingClientRect();
        const cellWidth = firstCellRect.width;
        const cellHeight = firstCellRect.height;
        const gridPaddingLeft = firstCellRect.left - gridRect.left;
        const gridPaddingTop = firstCellRect.top - gridRect.top;

        // Calculate horizontal gap between cells
        const lastCellInRow = gridRef.current.children[cols - 1];
        const gapX = lastCellInRow
            ? (lastCellInRow.getBoundingClientRect().left - firstCellRect.left - (cols - 1) * cellWidth) / Math.max(1, cols - 1)
            : 0;

        // Calculate vertical gap between cells (use cell in second row if available)
        const firstCellInSecondRow = rows > 1 ? gridRef.current.children[cols] : null;
        const gapY = firstCellInSecondRow
            ? (firstCellInSecondRow.getBoundingClientRect().top - firstCellRect.top - cellHeight)
            : gapX; // Fallback to gapX if only one row

        const cellWithGapWidth = cellWidth + gapX;
        const cellWithGapHeight = cellHeight + gapY;

        const adjustedX = touchX - gridRect.left - gridPaddingLeft;
        const adjustedY = touchY - gridRect.top - gridPaddingTop;

        const col = Math.floor(adjustedX / cellWithGapWidth);
        const row = Math.floor(adjustedY / cellWithGapHeight);

        if (row < 0 || row >= rows || col < 0 || col >= cols) return null;

        const gridRow = grid[row];
        const letter = gridRow?.[col];
        if (!letter) return null;

        // Calculate cell center for distance checking
        const cellCenterX = col * cellWithGapWidth + cellWidth / 2;
        const cellCenterY = row * cellWithGapHeight + cellHeight / 2;
        const distanceFromCenter = Math.sqrt(
            Math.pow(adjustedX - cellCenterX, 2) +
            Math.pow(adjustedY - cellCenterY, 2)
        );

        return {
            row,
            col,
            letter,
            distanceFromCenter,
            cellRadius: Math.min(cellWidth, cellHeight) / 2
        };
    }, [grid]);

    // Reset selection state
    const resetSelectionState = useCallback(() => {
        startCellRef.current = null;
    }, []);

    const handleTouchStart = (rowIndex: number, colIndex: number, letter: string, event: React.TouchEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => {
        if (!interactive) return;
        isTouchingRef.current = true;
        hasMovedRef.current = false;

        // Cancel any pending fade timeout to prevent it from clearing our new selection
        if (fadeTimeoutRef.current) {
            clearTimeout(fadeTimeoutRef.current);
            fadeTimeoutRef.current = null;
        }

        // Clear any fading animation to allow immediate re-selection
        // This ensures the grid feels responsive even during combo fade-out
        setFadingCells([]);

        // Store initial touch position for deadzone detection
        const touch = 'touches' in event ? event.touches?.[0] : event;
        if (!touch) return;
        startPosRef.current = { x: touch.clientX, y: touch.clientY };

        // Store start cell for reference
        startCellRef.current = { row: rowIndex, col: colIndex, letter };

        // Initialize selection with just the starting cell
        setSelectedCells([{ row: rowIndex, col: colIndex, letter }]);

        // Haptic feedback - medium vibration on start
        if (window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate(30);
        }
    };

    const handleTouchMove = (e: TouchEvent | MouseEvent) => {
        if (!interactive || !isTouchingRef.current) return;
        if ('cancelable' in e && e.cancelable) e.preventDefault();

        const touch = 'touches' in e ? e.touches[0] : e;
        if (!touch) return;
        const touchX = touch.clientX;
        const touchY = touch.clientY;

        // Deadzone check - must move minimum distance before selecting starts
        const deltaX = touchX - startPosRef.current.x;
        const deltaY = touchY - startPosRef.current.y;
        const totalMovement = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        if (!hasMovedRef.current && totalMovement < getDeadzoneThreshold()) {
            return;
        }
        hasMovedRef.current = true;

        // Get the cell currently under the touch point
        const currentCell = getCellAtPosition(touchX, touchY);
        if (!currentCell) return;

        const lastCell = selectedCells[selectedCells.length - 1];
        if (!lastCell) return;

        // Same cell - no change
        if (currentCell.row === lastCell.row && currentCell.col === lastCell.col) {
            return;
        }

        // ANTI-ACCIDENT MECHANISM: Must be close enough to cell center
        // This prevents accidentally selecting cells when dragging near edges
        const selectionThreshold = currentCell.cellRadius * CELL_SELECTION_THRESHOLD;
        if (currentCell.distanceFromCenter > selectionThreshold) {
            // Touch is near cell edge, not close enough to center - don't select
            return;
        }

        // Backtracking: if cell already selected, remove cells after it
        const existingIndex = selectedCells.findIndex(
            c => c.row === currentCell.row && c.col === currentCell.col
        );

        if (existingIndex !== -1) {
            const newSelection = selectedCells.slice(0, existingIndex + 1);
            if (newSelection.length !== selectedCells.length) {
                setSelectedCells(newSelection);
                if (window.navigator?.vibrate) window.navigator.vibrate(15);
            }
            return;
        }

        // New cell - check if adjacent to last selected cell
        if (isAdjacentCell(lastCell, currentCell)) {
            const newSelection = [...selectedCells, { row: currentCell.row, col: currentCell.col, letter: currentCell.letter }];
            setSelectedCells(newSelection);
            if (window.navigator?.vibrate) {
                const intensity = Math.min(20 + newSelection.length * 3 + comboLevel * 5, 60);
                window.navigator.vibrate(intensity);
            }
        }
        // If not adjacent, ignore - prevents jumping over cells
    };

    const handleTouchEnd = () => {
        if (!interactive || !isTouchingRef.current) return;
        isTouchingRef.current = false;

        // Clear auto-submit timeout if exists
        if (autoSubmitTimeoutRef.current) {
            clearTimeout(autoSubmitTimeoutRef.current);
            autoSubmitTimeoutRef.current = null;
        }

        // Reset selection state
        resetSelectionState();

        // Misclick prevention: only submit if user has moved OR selected multiple letters
        // This prevents accidental single-letter submissions from taps
        if (selectedCells.length > 0 && (hasMovedRef.current || selectedCells.length >= 2)) {
            const formedWord = selectedCells.map(c => c.letter).join('');
            if (onWordSubmit) {
                onWordSubmit(formedWord);
            }

            // Success vibration pattern on word submission
            // More intense for longer words and combos
            if (window.navigator && window.navigator.vibrate) {
                const wordLength = selectedCells.length;
                if (comboLevel > 0) {
                    // Combo celebration - intensity scales with combo level
                    // Higher combos = longer and more intense vibrations
                    if (comboLevel >= 7) {
                        // x8+ Epic rainbow combo - extreme celebration
                        window.navigator.vibrate([100, 50, 100, 50, 100, 50, 150]);
                    } else if (comboLevel >= 5) {
                        // x6-x7 High combo - very intense
                        window.navigator.vibrate([80, 40, 80, 40, 120]);
                    } else if (comboLevel >= 3) {
                        // x4-x5 Medium combo - intense
                        window.navigator.vibrate([60, 40, 60, 40, 100]);
                    } else if (comboLevel >= 1) {
                        // x2-x3 Low combo - moderate
                        window.navigator.vibrate([50, 30, 50, 30, 80]);
                    }
                } else if (wordLength >= 6) {
                    // Long word - double vibration
                    window.navigator.vibrate([40, 30, 60]);
                } else if (wordLength >= 3) {
                    // Valid word - single vibration
                    window.navigator.vibrate(50);
                }
            }

            // Use sequential fade-out animation for combo words (slower fade for combos)
            if (comboLevel > 0) {
                startSequentialFadeOut(true);
            } else {
                // Regular delay for non-combo words
                setTimeout(() => {
                    setSelectedCells([]);
                }, 500);
            }
        } else {
            // Clear selection immediately if it was a misclick
            setSelectedCells([]);
        }

        // Reset movement tracking
        hasMovedRef.current = false;
    };

    // Mouse support for desktop testing
    const handleMouseDown = (rowIndex: number, colIndex: number, letter: string, event: React.MouseEvent<HTMLDivElement>) => {
        handleTouchStart(rowIndex, colIndex, letter, event);
    };

    // Handle mouse move for directional locking on desktop
    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!interactive || !isTouchingRef.current) return;

        // Create mock touch event structure for unified handling
        const mockEvent = {
            touches: [{ clientX: e.clientX, clientY: e.clientY }],
            cancelable: true,
            preventDefault: () => {}
        } as any;
        handleTouchMove(mockEvent);
    };

    const handleMouseUp = () => {
        handleTouchEnd();
    };

    // Global mouse up to catch releases outside grid
    useEffect(() => {
        window.addEventListener('mouseup', handleMouseUp);
        return () => window.removeEventListener('mouseup', handleMouseUp);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCells]);


    const isLargeGrid = (grid[0]?.length || 0) > 8;

    // Get combo colors based on level - NEO-BRUTALIST FLAT COLORS with hard shadows
    const getComboColors = (level: number): ComboColors => {
        // Show combo bonus as +N (capped at +5 for scoring, but visual can go higher)
        const bonus = Math.min(level, 5); // Actual bonus caps at 5
        const bonusText = `+${bonus}`;

        if (level === 0) {
            // No combo - Electric Yellow (Neo-Brutalist primary)
            return {
                bg: 'bg-neo-yellow',
                border: 'border-neo-black',
                shadow: 'shadow-hard',
                text: null, // Don't show +0
                flicker: false
            };
        } else if (level === 1) {
            // +1 - Orange
            return {
                bg: 'bg-neo-orange',
                border: 'border-neo-black',
                shadow: 'shadow-hard-lg',
                text: bonusText,
                flicker: false
            };
        } else if (level === 2) {
            // +2 - Red
            return {
                bg: 'bg-neo-red',
                border: 'border-neo-black',
                shadow: 'shadow-hard-lg',
                text: bonusText,
                flicker: false,
                textColor: 'text-neo-white'
            };
        } else if (level === 3) {
            // +3 - Pink
            return {
                bg: 'bg-neo-pink',
                border: 'border-neo-black',
                shadow: 'shadow-hard-lg',
                text: bonusText,
                flicker: false,
                textColor: 'text-neo-white'
            };
        } else if (level === 4) {
            // +4 - Purple
            return {
                bg: 'bg-neo-purple',
                border: 'border-neo-black',
                shadow: 'shadow-hard-xl',
                text: bonusText,
                flicker: false,
                textColor: 'text-neo-white'
            };
        } else if (level === 5) {
            // +5 (max bonus) - Cyan
            return {
                bg: 'bg-neo-cyan',
                border: 'border-neo-black',
                shadow: 'shadow-hard-xl',
                text: bonusText,
                flicker: false
            };
        } else if (level === 6) {
            // +5 (visual level 6) - Lime
            return {
                bg: 'bg-neo-lime',
                border: 'border-neo-black',
                shadow: 'shadow-hard-xl',
                text: bonusText,
                flicker: false
            };
        } else if (level === 7) {
            // +5 (visual level 7) - Rainbow with hard shadow
            return {
                bg: 'rainbow-gradient',
                border: 'border-neo-black border-4',
                shadow: 'shadow-hard-xl',
                text: bonusText,
                flicker: false,
                isRainbow: true,
                textColor: 'text-neo-white'
            };
        } else if (level === 8) {
            // +5 (visual level 8) - Rainbow with strobe
            return {
                bg: 'rainbow-gradient',
                border: 'border-neo-black border-4',
                shadow: 'shadow-hard-2xl',
                text: bonusText,
                flicker: true,
                isRainbow: true,
                strobe: true,
                textColor: 'text-neo-white'
            };
        } else {
            // Level 9+ : Full rainbow with intense strobe (bonus still +5)
            return {
                bg: 'rainbow-gradient',
                border: 'border-neo-black border-5',
                shadow: 'shadow-hard-2xl',
                text: bonusText,
                flicker: true,
                isRainbow: true,
                strobe: true,
                intenseStrobe: true,
                textColor: 'text-neo-white'
            };
        }
    };

    const comboColors = getComboColors(comboLevel);

    // Get heat map style - glowing thermal overlay effect (red-pink-orange-yellow scheme)
    const getHeatMapStyle = (row: number, col: number): { r: number; g: number; b: number; t: number } | null => {
        if (!heatMapData || !heatMapData.cellUsageCounts) return null;
        const key = `${row},${col}`;
        const count = heatMapData.cellUsageCounts[key] || 0;
        if (count === 0) return null;

        const maxCount = heatMapData.maxCount || 1;
        const t = count / maxCount; // 0 to 1

        // Heat map: dark red -> red -> pink/magenta -> orange -> yellow -> white-hot
        let r: number, g: number, b: number;

        if (t < 0.2) {
            // Dark red to red
            const p = t / 0.2;
            r = Math.round(120 + p * 135);
            g = 0;
            b = Math.round(p * 30);
        } else if (t < 0.4) {
            // Red to pink/magenta
            const p = (t - 0.2) / 0.2;
            r = 255;
            g = Math.round(p * 50);
            b = Math.round(30 + p * 100);
        } else if (t < 0.6) {
            // Pink to orange
            const p = (t - 0.4) / 0.2;
            r = 255;
            g = Math.round(50 + p * 100);
            b = Math.round(130 - p * 130);
        } else if (t < 0.8) {
            // Orange to yellow
            const p = (t - 0.6) / 0.2;
            r = 255;
            g = Math.round(150 + p * 105);
            b = 0;
        } else {
            // Yellow to white-hot
            const p = (t - 0.8) / 0.2;
            r = 255;
            g = 255;
            b = Math.round(p * 180);
        }

        return { r, g, b, t };
    };

    return (
        <div className="relative w-full h-full flex items-center justify-center bg-slate-900">
            {/* Combo Indicator - Jumps through screen like GO animation */}
            <AnimatePresence mode="wait">
                {comboLevel > 0 && comboColors.text && (
                    <motion.div
                        key={`combo-${comboLevel}`}
                        initial={{ scale: 0, opacity: 0, x: '-50%', y: '-50%' }}
                        animate={{
                            scale: [0, 1.5, 1.2],
                            opacity: comboColors.flicker ? [0, 1, 0.7, 1, 0.8, 1, 0] : [0, 1, 0],
                            x: ['-50%', '-50%', '-50%'],
                            y: ['-50%', '-50%', '-150%']
                        }}
                        exit={{
                            scale: 0,
                            opacity: 0,
                            transition: { duration: 0.1 }
                        }}
                        transition={{
                            duration: comboColors.flicker ? 1.2 : 0.8,
                            times: comboColors.flicker ? [0, 0.2, 0.3, 0.5, 0.7, 0.9, 1] : [0, 0.4, 1],
                            ease: "easeOut"
                        }}
                        className="fixed top-1/2 left-1/2 z-50 pointer-events-none"
                        style={{ transform: 'translate(-50%, -50%)' }}
                    >
                        <motion.div
                            className={cn(
                                "px-6 py-3 rounded-full font-extrabold text-3xl md:text-4xl text-white backdrop-blur-sm",
                                !comboColors.isRainbow && `bg-gradient-to-r`,
                                comboColors.shadow,
                                "border-4 border-white/40"
                            )}
                            animate={comboColors.flicker ? {
                                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                            } : {}}
                            transition={comboColors.flicker ? {
                                duration: 1,
                                repeat: Infinity,
                                ease: "linear"
                            } : {}}
                            style={{
                                filter: comboColors.isRainbow
                                    ? 'drop-shadow(0 0 30px rgba(255, 255, 255, 1))'
                                    : 'drop-shadow(0 0 20px rgba(251, 146, 60, 0.8))',
                                ...(comboColors.isRainbow && {
                                    background: 'linear-gradient(90deg, #ef4444, #f97316, #eab308, #22c55e, #06b6d4, #3b82f6, #8b5cf6, #ec4899, #ef4444)',
                                    backgroundSize: '300% 100%',
                                    animation: 'rainbow-shift 1.5s linear infinite'
                                })
                            }}
                        >
                            {comboColors.isRainbow ? '🌈' : '🔥'} {comboColors.text}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* NEO-BRUTALIST: Clean frame wrapper - perfectly square, no tilt */}
            <div
                className="game-board-frame relative"
            >

                {/* Inner grid container */}
                <div
                    ref={gridRef}
                    dir="ltr"
                    className={cn(
                        "grid touch-none select-none relative rounded-neo w-full h-full",
                        isLargeGrid ? "gap-1 sm:gap-1" : "gap-1 sm:gap-1.5",
                        // Neo-Brutalist: cream paper background with subtle border
                        "bg-neo-cream border-2 border-neo-black/20",
                        className
                    )}
                    style={{
                        gridTemplateColumns: `repeat(${grid[0]?.length || 4}, minmax(0, 1fr))`,
                        gridTemplateRows: `repeat(${grid.length || 4}, minmax(0, 1fr))`,
                        // Subtle paper texture via background
                        backgroundImage: 'var(--halftone-pattern)',
                        backgroundColor: 'var(--neo-cream)',
                        // Set responsive font size based on grid size using CSS calc
                        // Formula: Each cell is (100% / gridSize), font should be ~55-70% of that
                        ['--cell-font-size' as any]: `calc((100cqw / ${grid[0]?.length || 4}) * ${largeText ? 0.55 : 0.50})`,
                        // Enable container query units
                        containerType: 'size',
                    }}
                    role="grid"
                    aria-label="Letter grid"
                    tabIndex={interactive ? 0 : -1}
                    onTouchMove={handleTouchMove as any}
                    onTouchEnd={handleTouchEnd}
                    onMouseMove={handleMouseMove}
                >
            {grid.map((row, i) =>
                row.map((cell, j) => {
                    const isSelected = selectedCells.some(c => c.row === i && c.col === j);
                    const firstSelected = selectedCells[0];
                    const isFirstSelected = firstSelected !== undefined && firstSelected.row === i && firstSelected.col === j;
                    const isFading = fadingCells.some(c => c.row === i && c.col === j);
                    return (
                        <motion.div
                            key={`${i}-${j}`}
                            data-row={i}
                            data-col={j}
                            data-letter={cell}
                            role="gridcell"
                            aria-selected={isSelected}
                            aria-label={`Letter ${cell}`}
                            tabIndex={interactive ? 0 : -1}
                            onTouchStart={(e) => handleTouchStart(i, j, cell, e)}
                            onMouseDown={(e) => handleMouseDown(i, j, cell, e)}
                            initial={animateOnMount
                                ? { scale: 0, opacity: 0, rotateX: -90, y: -20 }
                                : { scale: 0.8, opacity: 0 }
                            }
                            animate={{
                                scale: isSelected ? 1.08 : (isFading ? 1.04 : 1),
                                opacity: 1, // Letters never fade, only the styling
                                rotate: reduceMotion ? 0 : ((isSelected || isFading) ? [0, -5, 5, 0] : 0),
                                rotateX: 0,
                                y: isSelected ? -2 : 0
                            }}
                            whileTap={{ scale: 0.95 }}
                            transition={{
                                duration: reduceMotion
                                    ? 0.1
                                    : (animateOnMount && !isSelected
                                        ? 0.5
                                        : (isSelected ? 0.12 : 0.6)),
                                ease: animateOnMount ? [0.34, 1.56, 0.64, 1] : "easeOut",
                                delay: reduceMotion ? 0 : (animateOnMount ? (i + j) * 0.04 : 0),
                                scale: isSelected ? { type: "spring", stiffness: reduceMotion ? 200 : 350, damping: reduceMotion ? 30 : 22 } : undefined
                            }}
                            className={cn(
                                // NEO-BRUTALIST TILE: Clean, readable letters with hard shadows
                                "aspect-square flex items-center justify-center font-black cursor-pointer relative overflow-hidden",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan",
                                // NEO-BRUTALIST: Selected tiles get combo colors, unselected stay clean white
                                isSelected
                                    ? comboColors.isRainbow
                                        // Rainbow: gradient background with thick black border
                                        ? `${comboColors.textColor || 'text-neo-black'} ${comboColors.border} z-10 ${comboColors.shadow}`
                                        // Flat combo color with hard shadow
                                        : `${comboColors.bg} ${comboColors.textColor || 'text-neo-black'} border-3 ${comboColors.border} z-10 ${comboColors.shadow}`
                                    // UNSELECTED: Clean white tiles with subtle hard shadow - NO rotation, perfectly aligned
                                    : "bg-neo-white text-neo-black border-3 border-neo-black shadow-hard-sm hover:shadow-hard hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-hard-pressed",
                                // Smooth transition for styling
                                "transition-all",
                                comboLevel > 0 ? "duration-300" : "duration-100"
                            )}
                            style={{
                                // NEO-BRUTALIST: Chunky rounded corners
                                borderRadius: '4px',
                                // Responsive font size based on cell size
                                fontSize: 'var(--cell-font-size)',
                                ...(isSelected && comboColors.isRainbow ? {
                                    // Rainbow gradient with higher saturation for Neo-Brutalist
                                    background: 'linear-gradient(135deg, #FF3366, #FF6B35, #FFE135, #BFFF00, #00FFFF, #FF1493, #4a1c6a)',
                                    backgroundSize: '400% 400%',
                                    animation: comboColors.strobe
                                        ? (comboColors.intenseStrobe ? 'rainbow-cell 0.8s ease infinite, strobe-intense 0.12s infinite alternate' : 'rainbow-cell 1.2s ease infinite, strobe-light 0.2s infinite alternate')
                                        : 'rainbow-cell 1.5s ease infinite'
                                } : isSelected && comboColors.flicker ? {
                                    animation: 'flicker 0.12s infinite alternate'
                                } : {})
                            }}
                        >
                            {/* Ripple effect on selection */}
                            {isSelected && (
                                <>
                                    {/* Main ripple effect */}
                                    <motion.div
                                        className="absolute inset-0 bg-white/40"
                                        style={{ borderRadius: '8px' }}
                                        initial={{ scale: 0.5, opacity: 0.8 }}
                                        animate={{ scale: 2.5, opacity: 0 }}
                                        transition={{ duration: 0.4, ease: "easeOut" }}
                                    />

                                    {/* Bright flare effect - always visible on click */}
                                    <motion.div
                                        className="absolute inset-0 pointer-events-none"
                                        style={{
                                            background: 'radial-gradient(circle at center, rgba(255, 255, 255, 0.9), transparent 70%)',
                                            filter: 'blur(2px)',
                                            borderRadius: '8px'
                                        }}
                                        initial={{ scale: 0, opacity: 1 }}
                                        animate={{ scale: [0, 1.5, 0], opacity: [1, 0.5, 0] }}
                                        transition={{ duration: 0.5, ease: "easeOut" }}
                                    />

                                    {/* Enhanced fire burst for first selected cell (trail start) - Performance optimized */}
                                    {isFirstSelected && !reduceMotion && performanceMode !== 'minimal' && (
                                        <>
                                            {/* Fire burst particles - count varies by performance mode */}
                                            {[...Array(performanceMode === 'full' ? 8 : 4)].map((_, idx) => {
                                                const particleCount = performanceMode === 'full' ? 8 : 4;
                                                const angle = (idx * (360 / particleCount)) * (Math.PI / 180);
                                                const distance = 25 + (idx % 2) * 5;
                                                return (
                                                    <motion.div
                                                        key={`first-burst-${idx}`}
                                                        className="absolute w-3 h-3 rounded-full pointer-events-none"
                                                        style={{
                                                            background: idx % 3 === 0
                                                                ? 'radial-gradient(circle, #ffff00, #ff6b00)'
                                                                : idx % 3 === 1
                                                                ? 'radial-gradient(circle, #ff6b00, #ff0000)'
                                                                : 'radial-gradient(circle, #ff9500, #ff5500)',
                                                            left: '50%',
                                                            top: '50%',
                                                            marginLeft: '-6px',
                                                            marginTop: '-6px',
                                                            boxShadow: performanceMode === 'full' ? '0 0 8px rgba(255, 107, 0, 0.8)' : 'none'
                                                        }}
                                                        initial={{ scale: 0, opacity: 1, x: 0, y: 0 }}
                                                        animate={{
                                                            scale: [1, 2, 0],
                                                            opacity: [1, 0.9, 0],
                                                            x: Math.cos(angle) * distance,
                                                            y: Math.sin(angle) * distance
                                                        }}
                                                        transition={{
                                                            duration: 0.6,
                                                            ease: "easeOut",
                                                            delay: idx * 0.02
                                                        }}
                                                    />
                                                );
                                            })}

                                            {/* Pulsing glow at start - only on full performance */}
                                            {performanceMode === 'full' && (
                                                <motion.div
                                                    className="absolute inset-0 pointer-events-none"
                                                    style={{
                                                        background: 'radial-gradient(circle, rgba(255,107,0,0.6), transparent 60%)',
                                                        filter: 'blur(8px)',
                                                        borderRadius: '8px'
                                                    }}
                                                    animate={{
                                                        scale: [1, 1.8, 1],
                                                        opacity: [0.8, 0.4, 0.8],
                                                    }}
                                                    transition={{
                                                        duration: 0.4,
                                                        repeat: 2, // Limited repeats instead of Infinity
                                                        ease: "easeInOut"
                                                    }}
                                                />
                                            )}

                                            {/* Sparks - reduced count for performance */}
                                            {performanceMode === 'full' && [...Array(4)].map((_, idx) => {
                                                const angle = (idx * 90) * (Math.PI / 180);
                                                return (
                                                    <motion.div
                                                        key={`spark-${idx}`}
                                                        className="absolute w-1.5 h-1.5 rounded-full pointer-events-none"
                                                        style={{
                                                            background: 'radial-gradient(circle, #ffff00, #ff6b00)',
                                                            left: '50%',
                                                            top: '50%',
                                                            marginLeft: '-3px',
                                                            marginTop: '-3px'
                                                        }}
                                                        animate={{
                                                            scale: [0, 1.5, 0],
                                                            opacity: [1, 0.8, 0],
                                                            x: [0, Math.cos(angle) * 20, Math.cos(angle) * 30],
                                                            y: [0, Math.sin(angle) * 20, Math.sin(angle) * 30]
                                                        }}
                                                        transition={{
                                                            duration: 0.5,
                                                            repeat: 2, // Limited repeats
                                                            ease: "easeOut",
                                                            delay: idx * 0.1
                                                        }}
                                                    />
                                                );
                                            })}
                                        </>
                                    )}

                                    {/* Fire particles - performance optimized with reduced counts */}
                                    {!reduceMotion && performanceMode !== 'minimal' && (
                                    <>
                                        {/* Center burst particles - count based on performance */}
                                        {[...Array(performanceMode === 'full' ? 6 : 4)].map((_, idx) => {
                                            const count = performanceMode === 'full' ? 6 : 4;
                                            const angle = (idx * (360 / count)) * (Math.PI / 180);
                                            const distance = 15 + (comboLevel * 3);
                                            return (
                                                <motion.div
                                                    key={`burst-${idx}`}
                                                    className="absolute w-2 h-2 rounded-full pointer-events-none"
                                                    style={{
                                                        background: comboLevel > 0
                                                            ? 'radial-gradient(circle, #ff6b00, #ff0000)'
                                                            : 'radial-gradient(circle, #fbbf24, #f97316)',
                                                        left: '50%',
                                                        top: '50%',
                                                        marginLeft: '-4px',
                                                        marginTop: '-4px'
                                                    }}
                                                    initial={{ scale: 0, opacity: 1, x: 0, y: 0 }}
                                                    animate={{
                                                        scale: [0.5, 1.5, 0],
                                                        opacity: [1, 0.8, 0],
                                                        x: Math.cos(angle) * distance,
                                                        y: Math.sin(angle) * distance
                                                    }}
                                                    transition={{
                                                        duration: 0.4,
                                                        ease: "easeOut",
                                                        delay: idx * 0.02
                                                    }}
                                                />
                                            );
                                        })}

                                        {/* Corner fire particles for combo - only on full performance */}
                                        {comboLevel > 0 && performanceMode === 'full' && (
                                        <>
                                            {/* Top-right fire particle */}
                                            <motion.div
                                                className="absolute -top-1 -right-1 w-2 h-2 rounded-full pointer-events-none"
                                                style={{
                                                    background: 'radial-gradient(circle, #ff6b00, #ff0000)',
                                                    filter: 'blur(1px)'
                                                }}
                                                initial={{ scale: 0, opacity: 0 }}
                                                animate={{
                                                    scale: [1, 1.5, 1],
                                                    opacity: [0.8, 1, 0.8],
                                                    y: [-2, -4, -2],
                                                }}
                                                transition={{
                                                    duration: 0.4,
                                                    repeat: 3, // Limited repeats instead of Infinity
                                                    ease: "easeInOut"
                                                }}
                                            />

                                            {/* Bottom-left fire particle - reduced to 2 corner particles */}
                                            <motion.div
                                                className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full pointer-events-none"
                                                style={{
                                                    background: 'radial-gradient(circle, #ffcc00, #ff8800)',
                                                    filter: 'blur(1px)'
                                                }}
                                                initial={{ scale: 0, opacity: 0 }}
                                                animate={{
                                                    scale: [1, 1.2, 1],
                                                    opacity: [0.75, 1, 0.75],
                                                    y: [3, 5, 3],
                                                }}
                                                transition={{
                                                    duration: 0.5,
                                                    repeat: 3, // Limited repeats
                                                    ease: "easeInOut",
                                                    delay: 0.2
                                                }}
                                            />

                                            {/* Pulsing glow effect for high combos */}
                                            {comboLevel >= 3 && (
                                                <motion.div
                                                    className="absolute inset-0 pointer-events-none"
                                                    style={{
                                                        background: `radial-gradient(circle, ${comboLevel >= 4 ? 'rgba(168,85,247,0.4)' : 'rgba(255,107,0,0.3)'}, transparent)`,
                                                        filter: 'blur(3px)',
                                                        borderRadius: '8px'
                                                    }}
                                                    animate={{
                                                        scale: [1, 1.3, 1],
                                                        opacity: [0.5, 0.8, 0.5],
                                                    }}
                                                    transition={{
                                                        duration: 0.6,
                                                        repeat: 3, // Limited repeats
                                                        ease: "easeInOut"
                                                    }}
                                                />
                                            )}
                                        </>
                                    )}
                                </>
                                    )}
                            </>
                            )}
                            {/* Heat map glow overlay for results page */}
                            {(() => {
                                const heatStyle = getHeatMapStyle(i, j);
                                if (!heatStyle) return null;
                                const { r, g, b, t } = heatStyle;
                                return (
                                    <>
                                        {/* Outer glow layer */}
                                        <div
                                            className="absolute pointer-events-none"
                                            style={{
                                                inset: '-50%',
                                                background: `radial-gradient(circle, rgba(${r}, ${g}, ${b}, ${0.5 + t * 0.3}) 0%, rgba(${r}, ${g}, ${b}, 0.1) 50%, transparent 70%)`,
                                                filter: `blur(${8 + t * 12}px)`,
                                                zIndex: 5
                                            }}
                                        />
                                        {/* Inner core glow */}
                                        <div
                                            className="absolute pointer-events-none"
                                            style={{
                                                inset: '-20%',
                                                background: `radial-gradient(circle, rgba(${r}, ${g}, ${b}, ${0.6 + t * 0.35}) 0%, rgba(${r}, ${g}, ${b}, 0.2) 60%, transparent 80%)`,
                                                filter: `blur(${3 + t * 5}px)`,
                                                zIndex: 6
                                            }}
                                        />
                                        {/* Hot center spot for high values */}
                                        {t > 0.5 && (
                                            <div
                                                className="absolute pointer-events-none"
                                                style={{
                                                    inset: '10%',
                                                    background: `radial-gradient(circle, rgba(255, ${Math.round(200 + t * 55)}, ${Math.round(t * 200)}, ${0.4 + t * 0.4}) 0%, transparent 70%)`,
                                                    filter: `blur(${2 + t * 3}px)`,
                                                    zIndex: 7
                                                }}
                                            />
                                        )}
                                    </>
                                );
                            })()}
                            {cell}
                        </motion.div>
                    );
                })
            )}
                </div>
            </div>
        </div>
    );
});

GridComponent.displayName = 'GridComponent';

export default GridComponent;
