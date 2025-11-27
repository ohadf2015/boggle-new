import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { getDeadzoneThreshold } from '../utils/consts';

const noOp = () => { };

const GridComponent = ({
    grid,
    interactive = false,
    onWordSubmit,
    selectedCells: externalSelectedCells,
    className,
    largeText = false,
    playerView = false,
    comboLevel = 0,
    animateOnMount = false // When true, adds a slot machine style cascade animation on initial render
}) => {
    const [internalSelectedCells, setInternalSelectedCells] = useState([]);
    const [fadingCells, setFadingCells] = useState([]); // Track cells that are fading out
    const [reduceMotion, setReduceMotion] = useState(false);

    const isTouchingRef = useRef(false);
    const gridRef = useRef(null);
    const startPosRef = useRef({ x: 0, y: 0 });
    const hasMovedRef = useRef(false);
    const autoSubmitTimeoutRef = useRef(null);
    const startCellRef = useRef(null);           // { row, col, letter }

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
            const handler = (e) => setReduceMotion(!!e.matches);
            mq.addEventListener?.('change', handler);
            return () => mq.removeEventListener?.('change', handler);
        } catch {
            setReduceMotion(false);
        }
    }, []);

    // Sequential fade-out animation for combo trail
    // Combo trails fade out slower and with more dramatic timing
    // Trail fades from START to END (following the direction of the drag)
    const startSequentialFadeOut = useCallback((isCombo = false) => {
        if (selectedCells.length === 0) return;

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
        setTimeout(() => {
            setSelectedCells([]);
            setFadingCells([]);
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
    const isAdjacentCell = (cell1, cell2) => {
        const rowDiff = Math.abs(cell1.row - cell2.row);
        const colDiff = Math.abs(cell1.col - cell2.col);
        return rowDiff <= 1 && colDiff <= 1 && (rowDiff > 0 || colDiff > 0);
    };

    // Selection threshold - must be within this % of cell center to select
    // This prevents accidentally selecting cells when dragging near edges
    const CELL_SELECTION_THRESHOLD = 0.75; // 75% of cell radius

    // Get cell at touch position with cell center distance info
    const getCellAtPosition = useCallback((touchX, touchY) => {
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

        // Calculate gap between cells
        const lastCellInRow = gridRef.current.children[cols - 1];
        const gapX = lastCellInRow
            ? (lastCellInRow.getBoundingClientRect().left - firstCellRect.left - (cols - 1) * cellWidth) / Math.max(1, cols - 1)
            : 0;

        const cellWithGapWidth = cellWidth + gapX;
        const cellWithGapHeight = cellHeight + gapX;

        const adjustedX = touchX - gridRect.left - gridPaddingLeft;
        const adjustedY = touchY - gridRect.top - gridPaddingTop;

        const col = Math.floor(adjustedX / cellWithGapWidth);
        const row = Math.floor(adjustedY / cellWithGapHeight);

        if (row < 0 || row >= rows || col < 0 || col >= cols) return null;

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
            letter: grid[row][col],
            distanceFromCenter,
            cellRadius: cellWidth / 2
        };
    }, [grid]);

    // Reset selection state
    const resetSelectionState = useCallback(() => {
        startCellRef.current = null;
    }, []);

    const handleTouchStart = (rowIndex, colIndex, letter, event) => {
        if (!interactive) return;
        isTouchingRef.current = true;
        hasMovedRef.current = false;

        // Store initial touch position for deadzone detection
        const touch = event.touches?.[0] || event;
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

    const handleTouchMove = (e) => {
        if (!interactive || !isTouchingRef.current) return;
        if (e.cancelable) e.preventDefault();

        const touch = e.touches[0];
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
    const handleMouseDown = (rowIndex, colIndex, letter, event) => {
        handleTouchStart(rowIndex, colIndex, letter, event);
    };

    // Handle mouse move for directional locking on desktop
    const handleMouseMove = (e) => {
        if (!interactive || !isTouchingRef.current) return;

        // Create mock touch event structure for unified handling
        const mockEvent = {
            touches: [{ clientX: e.clientX, clientY: e.clientY }],
            cancelable: true,
            preventDefault: () => {}
        };
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

    // Get combo colors based on level (escalating colors for gamification)
    const getComboColors = (level) => {
        // Always show combo multiplier text, even for level 0
        const multiplier = `x${level + 1}`;

        if (level === 0) {
            return {
                gradient: 'from-yellow-400 to-orange-500',
                border: 'border-yellow-300',
                shadow: 'shadow-lg',
                text: null, // Don't show x1
                flicker: false
            };
        } else if (level === 1) {
            // x2 - Orange to red
            return {
                gradient: 'from-orange-400 to-red-500',
                border: 'border-orange-300',
                shadow: 'shadow-[0_0_15px_rgba(251,146,60,0.6)]',
                text: multiplier,
                flicker: false
            };
        } else if (level === 2) {
            // x3 - Red to pink
            return {
                gradient: 'from-red-400 to-pink-500',
                border: 'border-red-300',
                shadow: 'shadow-[0_0_20px_rgba(239,68,68,0.7)]',
                text: multiplier,
                flicker: false
            };
        } else if (level === 3) {
            // x4 - Pink to purple
            return {
                gradient: 'from-pink-400 to-purple-500',
                border: 'border-pink-300',
                shadow: 'shadow-[0_0_25px_rgba(236,72,153,0.8)]',
                text: multiplier,
                flicker: false
            };
        } else if (level === 4) {
            // x5 - Purple multi-gradient
            return {
                gradient: 'from-purple-400 via-pink-500 to-red-500',
                border: 'border-purple-300',
                shadow: 'shadow-[0_0_30px_rgba(168,85,247,0.9)]',
                text: multiplier,
                flicker: false
            };
        } else if (level === 5) {
            // x6 - Purple to cyan
            return {
                gradient: 'from-purple-400 via-blue-500 to-cyan-400',
                border: 'border-cyan-300',
                shadow: 'shadow-[0_0_35px_rgba(34,211,238,1)]',
                text: multiplier,
                flicker: false
            };
        } else if (level === 6) {
            // x7 - Cyan to green
            return {
                gradient: 'from-cyan-400 via-teal-500 to-green-400',
                border: 'border-teal-300',
                shadow: 'shadow-[0_0_40px_rgba(20,184,166,1)]',
                text: multiplier,
                flicker: false
            };
        } else if (level === 7) {
            // x8 - Rainbow (first rainbow level)
            return {
                gradient: 'rainbow-gradient',
                border: 'border-white',
                shadow: 'shadow-[0_0_50px_rgba(255,255,255,0.8)]',
                text: multiplier,
                flicker: false,
                isRainbow: true
            };
        } else if (level === 8) {
            // x9 - Rainbow with subtle pulse
            return {
                gradient: 'rainbow-gradient',
                border: 'border-white',
                shadow: 'shadow-[0_0_55px_rgba(255,255,255,0.9)]',
                text: multiplier,
                flicker: false,
                isRainbow: true,
                pulse: true
            };
        } else if (level === 9) {
            // x10 - Rainbow with light strobe
            return {
                gradient: 'rainbow-gradient',
                border: 'border-white',
                shadow: 'shadow-[0_0_60px_rgba(255,255,255,1)]',
                text: multiplier,
                flicker: true,
                isRainbow: true,
                strobe: true
            };
        } else {
            // Level 10+ (x11+): Full rainbow with intense strobe
            return {
                gradient: 'rainbow-gradient',
                border: 'border-white',
                shadow: 'shadow-[0_0_70px_rgba(255,255,255,1)]',
                text: multiplier,
                flicker: true,
                isRainbow: true,
                strobe: true,
                intenseStrobe: true
            };
        }
    };

    const comboColors = getComboColors(comboLevel);

    // Calculate cell positions for drawing trails
    const getCellCenter = (rowIndex, colIndex) => {
        if (!gridRef.current) return null;
        const gridElement = gridRef.current;
        const cells = gridElement.children;
        const cellIndex = rowIndex * (grid[0]?.length || 4) + colIndex;
        const cell = cells[cellIndex];
        if (!cell) return null;

        const cellRect = cell.getBoundingClientRect();
        const gridRect = gridElement.getBoundingClientRect();

        return {
            x: cellRect.left - gridRect.left + cellRect.width / 2,
            y: cellRect.top - gridRect.top + cellRect.height / 2
        };
    };

    return (
        <div className="relative w-full h-full flex items-center justify-center">
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
                                !comboColors.isRainbow && `bg-gradient-to-r ${comboColors.gradient}`,
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

            {/* Trail connector overlay - show for both selected and fading cells */}
            {(selectedCells.length > 1 || fadingCells.length > 1) && gridRef.current && (
                <svg
                    className="absolute inset-0 pointer-events-none z-0"
                    style={{ width: '100%', height: '100%' }}
                >
                    <defs>
                        <linearGradient id="trailGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor={comboLevel > 0 ? "#ff6b00" : "#fbbf24"} stopOpacity={0.8} />
                            <stop offset="100%" stopColor={comboLevel > 0 ? "#ff0000" : "#f97316"} stopOpacity={0.8} />
                        </linearGradient>
                        <filter id="glow">
                            <feGaussianBlur stdDeviation={comboLevel > 0 ? "3" : "2"} result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>
                    {/* Active selection trail */}
                    {selectedCells.map((cell, index) => {
                        if (index === 0) return null;
                        const prevCell = selectedCells[index - 1];
                        const start = getCellCenter(prevCell.row, prevCell.col);
                        const end = getCellCenter(cell.row, cell.col);

                        if (!start || !end) return null;

                        return (
                            <motion.line
                                key={`trail-${index}`}
                                x1={start.x}
                                y1={start.y}
                                x2={end.x}
                                y2={end.y}
                                stroke="url(#trailGradient)"
                                strokeWidth={comboLevel > 0 ? 4 : 3}
                                strokeLinecap="round"
                                filter="url(#glow)"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.1, ease: "easeOut" }}
                            />
                        );
                    })}
                    {/* Fading trail - renders during combo fade out with slower transition */}
                    {/* Fades from drag START to drag END (first segment fades first, last segment fades last) */}
                    {fadingCells.length > 1 && selectedCells.length === 0 && fadingCells.map((cell, index) => {
                        if (index === 0) return null;
                        const prevCell = fadingCells[index - 1];
                        const start = getCellCenter(prevCell.row, prevCell.col);
                        const end = getCellCenter(cell.row, cell.col);

                        if (!start || !end) return null;

                        // Segments are indexed 1 to N (index 0 is skipped as it's just a point, not a segment)
                        // We want: first segment (index=1) fades first (delay=0), last segment fades last
                        // So delay is simply proportional to (index - 1)
                        const fadeOrder = index - 1;

                        return (
                            <motion.line
                                key={`fading-trail-${index}`}
                                x1={start.x}
                                y1={start.y}
                                x2={end.x}
                                y2={end.y}
                                stroke="url(#trailGradient)"
                                strokeWidth={comboLevel > 0 ? 4 : 3}
                                strokeLinecap="round"
                                filter="url(#glow)"
                                initial={{ opacity: 1 }}
                                animate={{ opacity: 0 }}
                                transition={{
                                    // Combo: longer hold (500ms), slower fade (600ms), more stagger (120ms)
                                    // Regular: quick fade
                                    duration: comboLevel > 0 ? 0.6 : 0.3,
                                    ease: comboLevel > 0 ? [0.4, 0, 0.2, 1] : "easeOut",
                                    delay: comboLevel > 0 ? 0.5 + fadeOrder * 0.12 : fadeOrder * 0.05
                                }}
                            />
                        );
                    })}
                </svg>
            )}

            <div
                ref={gridRef}
                dir="ltr"
                className={cn(
                    "grid touch-none select-none relative rounded-2xl p-2 sm:p-3 md:p-4 aspect-square w-full max-w-[min(90vh,90vw)]",
                    isLargeGrid ? "gap-0.5 sm:gap-1" : "gap-1 sm:gap-1.5",
                    className
                )}
                style={{
                    gridTemplateColumns: `repeat(${grid[0]?.length || 4}, minmax(0, 1fr))`,
                    background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%)',
                    boxShadow: '0 0 60px rgba(6, 182, 212, 0.4), inset 0 0 40px rgba(6, 182, 212, 0.1)'
                }}
                role="grid"
                aria-label="Letter grid"
                tabIndex={interactive ? 0 : -1}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseMove={handleMouseMove}
            >
            {grid.map((row, i) =>
                row.map((cell, j) => {
                    const isSelected = selectedCells.some(c => c.row === i && c.col === j);
                    const isFirstSelected = selectedCells.length > 0 && selectedCells[0].row === i && selectedCells[0].col === j;
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
                                scale: isSelected ? { type: "spring", stiffness: reduceMotion ? 200 : 400, damping: reduceMotion ? 30 : 18 } : undefined
                            }}
                            className={cn(
                                "aspect-square flex items-center justify-center font-bold shadow-lg cursor-pointer border-2 relative overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500",
                                isLargeGrid
                                    ? (largeText ? "text-2xl sm:text-3xl" : "text-lg sm:text-xl")
                                    : (largeText || playerView ? "text-4xl sm:text-5xl md:text-6xl" : "text-2xl sm:text-3xl"),
                                // Only apply combo styling when selected (not when fading - fading cells return to normal)
                                isSelected
                                    ? comboColors.isRainbow
                                        ? `text-white ${comboColors.border} z-10 ${comboColors.shadow} border-white/40`
                                        : `bg-gradient-to-br ${comboColors.gradient} text-white ${comboColors.border} z-10 ${comboColors.shadow} border-white/40`
                                    : "bg-gradient-to-br from-slate-100 via-white to-slate-100 dark:from-slate-700 dark:via-slate-800 dark:to-slate-900 text-slate-900 dark:text-white border-slate-300/60 dark:border-slate-600/60 hover:scale-105 hover:shadow-xl dark:hover:bg-slate-700/80 active:scale-95 shadow-[0_4px_12px_rgba(0,0,0,0.1)]",
                                // Smooth transition for combo styling fade
                                "transition-all",
                                comboLevel > 0 ? "duration-500" : "duration-200"
                            )}
                            style={{
                                borderRadius: '8px',
                                ...(isSelected && comboColors.isRainbow ? {
                                    background: 'linear-gradient(135deg, #ef4444, #f97316, #eab308, #22c55e, #06b6d4, #3b82f6, #8b5cf6, #ec4899)',
                                    backgroundSize: '400% 400%',
                                    animation: comboColors.strobe
                                        ? (comboColors.intenseStrobe ? 'rainbow-cell 1s ease infinite, strobe-intense 0.15s infinite alternate' : 'rainbow-cell 1.5s ease infinite, strobe-light 0.25s infinite alternate')
                                        : 'rainbow-cell 2s ease infinite'
                                } : isSelected && comboColors.flicker ? {
                                    animation: 'flicker 0.15s infinite alternate'
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

                                    {/* Enhanced fire burst for first selected cell (trail start) */}
                                    {isFirstSelected && (
                                        <>
                                            {/* Large fire burst particles */}
                                            {[...Array(16)].map((_, idx) => {
                                                const angle = (idx * 22.5) * (Math.PI / 180);
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
                                                            filter: 'blur(1.5px)',
                                                            left: '50%',
                                                            top: '50%',
                                                            marginLeft: '-6px',
                                                            marginTop: '-6px',
                                                            boxShadow: '0 0 8px rgba(255, 107, 0, 0.8)'
                                                        }}
                                                        initial={{ scale: 0, opacity: 1, x: 0, y: 0 }}
                                                        animate={{
                                                            scale: [1, 2, 0],
                                                            opacity: [1, 0.9, 0],
                                                            x: Math.cos(angle) * distance,
                                                            y: Math.sin(angle) * distance
                                                        }}
                                                        transition={{
                                                            duration: 0.8,
                                                            ease: "easeOut",
                                                            delay: idx * 0.015
                                                        }}
                                                    />
                                                );
                                            })}

                                            {/* Pulsing glow at start */}
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
                                                    repeat: Infinity,
                                                    ease: "easeInOut"
                                                }}
                                            />

                                            {/* Continuous sparks emanating from start */}
                                            {[...Array(6)].map((_, idx) => {
                                                const angle = (idx * 60) * (Math.PI / 180);
                                                return (
                                                    <motion.div
                                                        key={`spark-${idx}`}
                                                        className="absolute w-1.5 h-1.5 rounded-full pointer-events-none"
                                                        style={{
                                                            background: 'radial-gradient(circle, #ffff00, #ff6b00)',
                                                            filter: 'blur(0.5px)',
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
                                                            repeat: Infinity,
                                                            ease: "easeOut",
                                                            delay: idx * 0.08
                                                        }}
                                                    />
                                                );
                                            })}
                                        </>
                                    )}

                                    {/* Fire particles - enhanced and always visible */}
                                    <>
                                        {/* Center burst particles */}
                                        {[...Array(8)].map((_, idx) => {
                                            const angle = (idx * 45) * (Math.PI / 180);
                                            const distance = 15 + (comboLevel * 3);
                                            return (
                                                <motion.div
                                                    key={`burst-${idx}`}
                                                    className="absolute w-2 h-2 rounded-full pointer-events-none"
                                                    style={{
                                                        background: comboLevel > 0
                                                            ? 'radial-gradient(circle, #ff6b00, #ff0000)'
                                                            : 'radial-gradient(circle, #fbbf24, #f97316)',
                                                        filter: 'blur(1px)',
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
                                                        delay: idx * 0.015
                                                    }}
                                                />
                                            );
                                        })}

                                        {/* Corner fire particles for combo */}
                                        {comboLevel > 0 && (
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
                                                    repeat: Infinity,
                                                    ease: "easeInOut"
                                                }}
                                            />

                                            {/* Top-left fire particle */}
                                            <motion.div
                                                className="absolute -top-1 -left-1 w-2 h-2 rounded-full pointer-events-none"
                                                style={{
                                                    background: 'radial-gradient(circle, #ffaa00, #ff6b00)',
                                                    filter: 'blur(1px)'
                                                }}
                                                initial={{ scale: 0, opacity: 0 }}
                                                animate={{
                                                    scale: [1, 1.3, 1],
                                                    opacity: [0.7, 1, 0.7],
                                                    y: [-3, -5, -3],
                                                }}
                                                transition={{
                                                    duration: 0.45,
                                                    repeat: Infinity,
                                                    ease: "easeInOut",
                                                    delay: 0.1
                                                }}
                                            />

                                            {/* Bottom-right fire particle */}
                                            <motion.div
                                                className="absolute -bottom-1 -right-1 w-2 h-2 rounded-full pointer-events-none"
                                                style={{
                                                    background: 'radial-gradient(circle, #ff9500, #ff5500)',
                                                    filter: 'blur(1px)'
                                                }}
                                                initial={{ scale: 0, opacity: 0 }}
                                                animate={{
                                                    scale: [1, 1.4, 1],
                                                    opacity: [0.6, 0.9, 0.6],
                                                    y: [2, 4, 2],
                                                }}
                                                transition={{
                                                    duration: 0.42,
                                                    repeat: Infinity,
                                                    ease: "easeInOut",
                                                    delay: 0.2
                                                }}
                                            />

                                            {/* Bottom-left fire particle */}
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
                                                    repeat: Infinity,
                                                    ease: "easeInOut",
                                                    delay: 0.3
                                                }}
                                            />

                                            {/* Pulsing glow effect for high combos */}
                                            {comboLevel >= 2 && (
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
                                                        repeat: Infinity,
                                                        ease: "easeInOut"
                                                    }}
                                                />
                                            )}
                                        </>
                                    )}
                                </>
                            </>
                            )}
                            {cell}
                        </motion.div>
                    );
                })
            )}
            </div>
        </div>
    );
};

export default GridComponent;
