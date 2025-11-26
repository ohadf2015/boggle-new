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
    const [direction, setDirection] = useState(null); // Track the direction of movement
    const [fadingCells, setFadingCells] = useState([]); // Track cells that are fading out
    const [isAxisLocked, setIsAxisLocked] = useState(false); // Visual feedback state
    const [axisGuidePoints, setAxisGuidePoints] = useState(null); // { start, end } for guide line
    const [projectedPosition, setProjectedPosition] = useState(null); // { x, y } for projection dot

    const isTouchingRef = useRef(false);
    const gridRef = useRef(null);
    const startPosRef = useRef({ x: 0, y: 0 });
    const hasMovedRef = useRef(false);
    const autoSubmitTimeoutRef = useRef(null);

    // Directional locking refs
    const startCellRef = useRef(null);           // { row, col, letter }
    const startCellCenterRef = useRef(null);     // { x, y } viewport coordinates
    const lockedAngleRef = useRef(null);         // Snapped angle (0, 45, 90, etc.) or null
    const lockedDirectionRef = useRef(null);     // { dx, dy, dRow, dCol, isDiagonal }
    const cellSizeRef = useRef(null);            // Cell size in pixels

    const MOVEMENT_THRESHOLD = 10; // pixels - minimum movement to register as intentional

    // Use external control if provided, otherwise internal state
    const selectedCells = externalSelectedCells || internalSelectedCells;
    const setSelectedCells = externalSelectedCells ? noOp : setInternalSelectedCells;

    // Auto-focus on grid when game becomes interactive
    useEffect(() => {
        if (interactive && gridRef.current) {
            gridRef.current.focus();
        }
    }, [interactive]);

    // Sequential fade-out animation for combo trail
    const startSequentialFadeOut = useCallback(() => {
        if (selectedCells.length === 0) return;

        // Copy selected cells for fading animation
        const cellsToFade = [...selectedCells];
        setFadingCells(cellsToFade);

        // Fade out each cell sequentially in the order they were marked
        cellsToFade.forEach((cell, index) => {
            setTimeout(() => {
                setFadingCells(prev => prev.filter(c => !(c.row === cell.row && c.col === cell.col)));
            }, index * 80); // 80ms delay between each cell fade
        });

        // Clear all selections after animation completes
        const totalDelay = cellsToFade.length * 80 + 200;
        setTimeout(() => {
            setSelectedCells([]);
            setDirection(null);
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

                    // Start sequential fade-out animation
                    startSequentialFadeOut();

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

    // Helper function to normalize direction to unit vector
    const normalizeDirection = (rowDiff, colDiff) => {
        // Return the direction as a unit vector (sign of the differences)
        return {
            row: rowDiff === 0 ? 0 : (rowDiff > 0 ? 1 : -1),
            col: colDiff === 0 ? 0 : (colDiff > 0 ? 1 : -1)
        };
    };

    // Helper function to check if a move continues in the same direction
    const isValidDirection = (rowDiff, colDiff, currentDirection) => {
        // If no direction set yet (first move), any adjacent cell is valid
        if (!currentDirection) return true;

        // Normalize the new direction
        const newDir = normalizeDirection(rowDiff, colDiff);

        // Check if the new direction matches the established direction
        return newDir.row === currentDirection.row && newDir.col === currentDirection.col;
    };

    // ==================== Directional Locking Helper Functions ====================

    // Calculate angle in degrees from delta coordinates
    const calculateAngle = (dx, dy) => {
        const radians = Math.atan2(dy, dx);
        const degrees = radians * (180 / Math.PI);
        return ((degrees % 360) + 360) % 360;
    };

    // Snap to nearest 45-degree increment
    const snapAngleTo45 = (angleDegrees) => {
        const snapped = Math.round(angleDegrees / 45) * 45;
        return snapped % 360;
    };

    // Get direction vectors for a snapped angle
    const getDirectionFromAngle = (angle) => {
        const directions = {
            0:   { dx: 1,  dy: 0,  dRow: 0,  dCol: 1  },  // Right
            45:  { dx: 1,  dy: 1,  dRow: 1,  dCol: 1  },  // Down-Right
            90:  { dx: 0,  dy: 1,  dRow: 1,  dCol: 0  },  // Down
            135: { dx: -1, dy: 1,  dRow: 1,  dCol: -1 },  // Down-Left
            180: { dx: -1, dy: 0,  dRow: 0,  dCol: -1 },  // Left
            225: { dx: -1, dy: -1, dRow: -1, dCol: -1 },  // Up-Left
            270: { dx: 0,  dy: -1, dRow: -1, dCol: 0  },  // Up
            315: { dx: 1,  dy: -1, dRow: -1, dCol: 1  },  // Up-Right
        };
        const dir = directions[angle] || directions[0];
        const isDiagonal = angle % 90 !== 0;
        // Normalize diagonal vectors for proper projection
        if (isDiagonal) {
            const sqrt2 = Math.SQRT2;
            return { ...dir, dx: dir.dx / sqrt2, dy: dir.dy / sqrt2, isDiagonal };
        }
        return { ...dir, isDiagonal: false };
    };

    // Project touch onto locked axis
    const projectOntoAxis = (touchX, touchY, startX, startY, dirX, dirY) => {
        const vecX = touchX - startX;
        const vecY = touchY - startY;
        const dot = vecX * dirX + vecY * dirY;
        return {
            x: startX + dot * dirX,
            y: startY + dot * dirY,
            distance: dot
        };
    };

    // Get cell center in viewport coordinates
    const getCellCenterViewport = useCallback((rowIndex, colIndex) => {
        if (!gridRef.current) return null;
        const cells = gridRef.current.children;
        const cellIndex = rowIndex * (grid[0]?.length || 4) + colIndex;
        const cell = cells[cellIndex];
        if (!cell) return null;
        const rect = cell.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }, [grid]);

    // Calculate cells along direction from start
    const getCellsAlongDirection = useCallback((startRow, startCol, dRow, dCol, numCells, forward) => {
        const cells = [];
        const sign = forward ? 1 : -1;
        for (let i = 0; i < numCells; i++) {
            const row = startRow - (i * dRow * sign);
            const col = startCol - (i * dCol * sign);
            if (row < 0 || row >= grid.length || col < 0 || col >= grid[0].length) break;
            cells.push({ row, col, letter: grid[row][col] });
        }
        return cells;
    }, [grid]);

    // Calculate axis guide line endpoints (extends to grid edges)
    const calculateAxisGuidePoints = useCallback((centerX, centerY, dirX, dirY) => {
        if (!gridRef.current) return null;
        const gridRect = gridRef.current.getBoundingClientRect();
        const relX = centerX - gridRect.left;
        const relY = centerY - gridRect.top;

        // Extend line to grid boundaries in both directions
        const extendToEdge = (x, y, dx, dy, width, height) => {
            if (dx === 0 && dy === 0) return { x, y };
            let t = Infinity;
            if (dx > 0) t = Math.min(t, (width - x) / dx);
            if (dx < 0) t = Math.min(t, -x / dx);
            if (dy > 0) t = Math.min(t, (height - y) / dy);
            if (dy < 0) t = Math.min(t, -y / dy);
            return { x: x + dx * t, y: y + dy * t };
        };

        const forward = extendToEdge(relX, relY, dirX, dirY, gridRect.width, gridRect.height);
        const backward = extendToEdge(relX, relY, -dirX, -dirY, gridRect.width, gridRect.height);

        return { start: backward, end: forward, center: { x: relX, y: relY } };
    }, []);

    // Reset all directional locking state
    const resetDirectionalLock = useCallback(() => {
        lockedAngleRef.current = null;
        lockedDirectionRef.current = null;
        startCellRef.current = null;
        startCellCenterRef.current = null;
        setIsAxisLocked(false);
        setAxisGuidePoints(null);
        setProjectedPosition(null);
    }, []);

    // ==================== End Directional Locking Helpers ====================

    const handleTouchStart = (rowIndex, colIndex, letter, event) => {
        if (!interactive) return;
        isTouchingRef.current = true;
        hasMovedRef.current = false;

        // Store initial touch position for misclick prevention
        const touch = event.touches?.[0] || event;
        const touchX = touch.clientX;
        const touchY = touch.clientY;
        startPosRef.current = { x: touchX, y: touchY };

        // Store start cell info for directional locking
        startCellRef.current = { row: rowIndex, col: colIndex, letter };
        startCellCenterRef.current = getCellCenterViewport(rowIndex, colIndex);

        // Calculate cell size for distance calculations
        if (gridRef.current?.children[0]) {
            const rect = gridRef.current.children[0].getBoundingClientRect();
            cellSizeRef.current = rect.width;
        }

        // Reset direction lock state
        lockedAngleRef.current = null;
        lockedDirectionRef.current = null;
        setIsAxisLocked(false);
        setAxisGuidePoints(null);
        setProjectedPosition(null);

        setSelectedCells([{ row: rowIndex, col: colIndex, letter }]);

        // Enhanced haptic feedback - medium vibration on start
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

        // Calculate total movement from start
        const deltaX = touchX - startPosRef.current.x;
        const deltaY = touchY - startPosRef.current.y;
        const totalMovement = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        const deadzoneThreshold = getDeadzoneThreshold();

        // Phase 1: Within deadzone - don't lock yet
        if (lockedAngleRef.current === null && totalMovement < deadzoneThreshold) {
            return;
        }

        // Phase 2: Lock direction if not already locked
        if (lockedAngleRef.current === null) {
            hasMovedRef.current = true;
            const startCenter = startCellCenterRef.current;
            if (!startCenter) return;

            const dxFromCenter = touchX - startCenter.x;
            const dyFromCenter = touchY - startCenter.y;
            const rawAngle = calculateAngle(dxFromCenter, dyFromCenter);
            const snappedAngle = snapAngleTo45(rawAngle);

            lockedAngleRef.current = snappedAngle;
            lockedDirectionRef.current = getDirectionFromAngle(snappedAngle);

            // Calculate and set axis guide points for visual
            const guidePoints = calculateAxisGuidePoints(
                startCenter.x, startCenter.y,
                lockedDirectionRef.current.dx, lockedDirectionRef.current.dy
            );
            setAxisGuidePoints(guidePoints);
            setIsAxisLocked(true);

            // Haptic feedback for axis lock
            if (window.navigator?.vibrate) window.navigator.vibrate([15, 10, 25]);
        }

        // Phase 3: Project touch onto locked axis and select cells
        const startCenter = startCellCenterRef.current;
        const dir = lockedDirectionRef.current;
        if (!startCenter || !dir) return;

        const projection = projectOntoAxis(
            touchX, touchY, startCenter.x, startCenter.y, dir.dx, dir.dy
        );

        // Update projected position for visual indicator (relative to grid)
        const gridRect = gridRef.current?.getBoundingClientRect();
        if (gridRect) {
            setProjectedPosition({
                x: projection.x - gridRect.left,
                y: projection.y - gridRect.top
            });
        }

        // Calculate number of cells based on projection distance
        const cellSize = cellSizeRef.current || 50;
        const effectiveSpacing = dir.isDiagonal ? cellSize * Math.SQRT2 : cellSize;
        const absDistance = Math.abs(projection.distance);
        const numCells = Math.max(1, Math.floor((absDistance + effectiveSpacing * 0.4) / effectiveSpacing) + 1);
        const forward = projection.distance >= 0;

        // Get cells along direction
        const startCell = startCellRef.current;
        if (!startCell) return;

        const newCells = getCellsAlongDirection(
            startCell.row, startCell.col, dir.dRow, dir.dCol, numCells, forward
        );

        // Check if returned to start cell (only start cell selected) after having more
        if (newCells.length === 1 && selectedCells.length > 1) {
            // Release axis lock - user can choose new direction
            lockedAngleRef.current = null;
            lockedDirectionRef.current = null;
            setIsAxisLocked(false);
            setAxisGuidePoints(null);
            setProjectedPosition(null);
            // Reset start position to allow new direction from current touch
            startPosRef.current = { x: touchX, y: touchY };
            if (window.navigator?.vibrate) window.navigator.vibrate(20);
        }

        // Update selection if changed
        const cellsChanged = newCells.length !== selectedCells.length ||
            newCells.some((c, i) => c.row !== selectedCells[i]?.row || c.col !== selectedCells[i]?.col);

        if (cellsChanged) {
            // Haptic feedback
            if (newCells.length > selectedCells.length && window.navigator?.vibrate) {
                const intensity = Math.min(20 + newCells.length * 3 + comboLevel * 5, 60);
                window.navigator.vibrate(intensity);
            } else if (newCells.length < selectedCells.length && window.navigator?.vibrate) {
                window.navigator.vibrate(15);
            }
            setSelectedCells(newCells);
        }
    };

    const handleTouchEnd = () => {
        if (!interactive || !isTouchingRef.current) return;
        isTouchingRef.current = false;

        // Clear auto-submit timeout if exists
        if (autoSubmitTimeoutRef.current) {
            clearTimeout(autoSubmitTimeoutRef.current);
            autoSubmitTimeoutRef.current = null;
        }

        // Reset directional locking state
        resetDirectionalLock();

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

            // Use sequential fade-out animation for combo words
            if (comboLevel > 0) {
                startSequentialFadeOut();
            } else {
                // Regular delay for non-combo words
                setTimeout(() => {
                    setSelectedCells([]);
                    setDirection(null);
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
            return {
                gradient: 'from-orange-400 to-red-500',
                border: 'border-orange-300',
                shadow: 'shadow-[0_0_15px_rgba(251,146,60,0.6)]',
                text: multiplier,
                flicker: false
            };
        } else if (level === 2) {
            return {
                gradient: 'from-red-400 to-pink-500',
                border: 'border-red-300',
                shadow: 'shadow-[0_0_20px_rgba(239,68,68,0.7)]',
                text: multiplier,
                flicker: false
            };
        } else if (level === 3) {
            return {
                gradient: 'from-pink-400 to-purple-500',
                border: 'border-pink-300',
                shadow: 'shadow-[0_0_25px_rgba(236,72,153,0.8)]',
                text: multiplier,
                flicker: false
            };
        } else if (level === 4) {
            return {
                gradient: 'from-purple-400 via-pink-500 to-red-500',
                border: 'border-purple-300',
                shadow: 'shadow-[0_0_30px_rgba(168,85,247,0.9)]',
                text: multiplier,
                flicker: false
            };
        } else if (level === 5) {
            return {
                gradient: 'from-purple-400 via-blue-500 to-cyan-400',
                border: 'border-cyan-300',
                shadow: 'shadow-[0_0_35px_rgba(34,211,238,1)]',
                text: multiplier,
                flicker: false
            };
        } else if (level === 6) {
            return {
                gradient: 'from-cyan-400 via-teal-500 to-green-400',
                border: 'border-teal-300',
                shadow: 'shadow-[0_0_40px_rgba(20,184,166,1)]',
                text: multiplier,
                flicker: false
            };
        } else if (level === 7) {
            return {
                gradient: 'from-green-400 via-lime-500 to-yellow-400',
                border: 'border-lime-300',
                shadow: 'shadow-[0_0_45px_rgba(132,204,22,1)]',
                text: multiplier,
                flicker: false
            };
        } else if (level === 8) {
            return {
                gradient: 'from-yellow-400 via-orange-500 to-red-500',
                border: 'border-orange-300',
                shadow: 'shadow-[0_0_50px_rgba(251,146,60,1)]',
                text: multiplier,
                flicker: false
            };
        } else if (level === 9) {
            return {
                gradient: 'from-red-500 via-pink-500 to-purple-500',
                border: 'border-pink-300',
                shadow: 'shadow-[0_0_55px_rgba(236,72,153,1)]',
                text: multiplier,
                flicker: false
            };
        } else {
            // Level 10+: Full rainbow gradient with flicker animation
            return {
                gradient: 'rainbow-gradient',
                border: 'border-white',
                shadow: 'shadow-[0_0_60px_rgba(255,255,255,1)]',
                text: multiplier,
                flicker: true,
                isRainbow: true
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

            {/* Trail connector overlay */}
            {selectedCells.length > 1 && gridRef.current && (
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
                </svg>
            )}

            {/* Axis Guide Line - shown when direction is locked */}
            {isAxisLocked && axisGuidePoints && gridRef.current && (
                <svg
                    className="absolute inset-0 pointer-events-none z-0"
                    style={{ width: '100%', height: '100%' }}
                >
                    <defs>
                        <filter id="projectionGlow" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="4" result="blur" />
                            <feMerge>
                                <feMergeNode in="blur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>
                    {/* Axis guide line extending across grid */}
                    <motion.line
                        x1={axisGuidePoints.start.x}
                        y1={axisGuidePoints.start.y}
                        x2={axisGuidePoints.end.x}
                        y2={axisGuidePoints.end.y}
                        stroke={comboLevel > 0 ? "#f97316" : "#eab308"}
                        strokeWidth={2}
                        strokeDasharray="8,6"
                        strokeOpacity={0.5}
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 0.5 }}
                        transition={{ duration: 0.25 }}
                    />
                    {/* Projection dot - shows where touch maps onto axis */}
                    {projectedPosition && (
                        <motion.circle
                            cx={projectedPosition.x}
                            cy={projectedPosition.y}
                            r={10}
                            fill={comboLevel > 0 ? "#f97316" : "#eab308"}
                            fillOpacity={0.6}
                            filter="url(#projectionGlow)"
                            initial={{ scale: 0 }}
                            animate={{ scale: [1, 1.3, 1] }}
                            transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
                        />
                    )}
                </svg>
            )}

            <div
                ref={gridRef}
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
                            onTouchStart={(e) => handleTouchStart(i, j, cell, e)}
                            onMouseDown={(e) => handleMouseDown(i, j, cell, e)}
                            initial={animateOnMount
                                ? { scale: 0, opacity: 0, rotateX: -90, y: -20 }
                                : { scale: 0.8, opacity: 0 }
                            }
                            animate={{
                                scale: isSelected || isFading ? 1.15 : 1,
                                opacity: isFading ? 0 : 1,
                                rotate: (isSelected || isFading) ? [0, -5, 5, 0] : 0,
                                rotateX: 0,
                                y: isSelected ? -2 : 0
                            }}
                            whileTap={{ scale: 0.95 }}
                            transition={{
                                duration: animateOnMount && !isSelected && !isFading ? 0.5 : (isFading ? 0.3 : (isSelected ? 0.12 : 0.6)),
                                ease: animateOnMount ? [0.34, 1.56, 0.64, 1] : "easeOut", // Spring-like bounce for mount animation
                                delay: animateOnMount ? (i + j) * 0.04 : 0, // Cascade delay from top-left
                                scale: isSelected ? { type: "spring", stiffness: 400, damping: 18 } : undefined
                            }}
                            className={cn(
                                "aspect-square flex items-center justify-center font-bold shadow-lg cursor-pointer transition-all duration-200 border-2 relative overflow-hidden",
                                isLargeGrid
                                    ? (largeText ? "text-2xl sm:text-3xl" : "text-lg sm:text-xl")
                                    : (largeText || playerView ? "text-4xl sm:text-5xl md:text-6xl" : "text-2xl sm:text-3xl"),
                                (isSelected || isFading)
                                    ? comboColors.isRainbow
                                        ? `text-white ${comboColors.border} z-10 ${comboColors.shadow} border-white/40`
                                        : `bg-gradient-to-br ${comboColors.gradient} text-white ${comboColors.border} z-10 ${comboColors.shadow} border-white/40`
                                    : "bg-gradient-to-br from-slate-100 via-white to-slate-100 dark:from-slate-700 dark:via-slate-800 dark:to-slate-900 text-slate-900 dark:text-white border-slate-300/60 dark:border-slate-600/60 hover:scale-105 hover:shadow-xl dark:hover:bg-slate-700/80 active:scale-95 shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
                            )}
                            style={{
                                borderRadius: '8px',
                                ...((isSelected || isFading) && comboColors.isRainbow ? {
                                    background: 'linear-gradient(135deg, #ef4444, #f97316, #eab308, #22c55e, #06b6d4, #3b82f6, #8b5cf6, #ec4899)',
                                    backgroundSize: '400% 400%',
                                    animation: 'rainbow-cell 2s ease infinite'
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
