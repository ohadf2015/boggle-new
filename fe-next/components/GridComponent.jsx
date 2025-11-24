import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

const GridComponent = ({
    grid,
    interactive = false,
    onWordSubmit,
    selectedCells: externalSelectedCells,
    className,
    largeText = false,
    playerView = false,
    comboLevel = 0
}) => {
    const [internalSelectedCells, setInternalSelectedCells] = useState([]);
    const isTouchingRef = useRef(false);
    const gridRef = useRef(null);
    const startPosRef = useRef({ x: 0, y: 0 });
    const hasMovedRef = useRef(false);
    const MOVEMENT_THRESHOLD = 10; // pixels - minimum movement to register as intentional

    // Use external control if provided, otherwise internal state
    const selectedCells = externalSelectedCells || internalSelectedCells;
    const setSelectedCells = externalSelectedCells ? () => { } : setInternalSelectedCells;

    // Auto-focus on grid when game becomes interactive
    useEffect(() => {
        if (interactive && gridRef.current) {
            gridRef.current.focus();
        }
    }, [interactive]);

    const handleTouchStart = (rowIndex, colIndex, letter, event) => {
        if (!interactive) return;
        isTouchingRef.current = true;
        hasMovedRef.current = false;

        // Store initial touch position for misclick prevention
        if (event.touches && event.touches[0]) {
            startPosRef.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
        } else if (event.clientX !== undefined) {
            startPosRef.current = { x: event.clientX, y: event.clientY };
        }

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

        // Misclick prevention: check if user has moved enough from start position
        if (!hasMovedRef.current) {
            const deltaX = Math.abs(touch.clientX - startPosRef.current.x);
            const deltaY = Math.abs(touch.clientY - startPosRef.current.y);
            const totalMovement = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

            if (totalMovement < MOVEMENT_THRESHOLD) {
                // User hasn't moved enough yet - don't register as intentional movement
                return;
            }
            // User has moved enough - mark as intentional
            hasMovedRef.current = true;
        }

        const element = document.elementFromPoint(touch.clientX, touch.clientY);

        if (element && element.dataset.row !== undefined) {
            const rowIndex = parseInt(element.dataset.row);
            const colIndex = parseInt(element.dataset.col);
            const letter = element.dataset.letter;

            const lastCell = selectedCells[selectedCells.length - 1];

            // Avoid rapid re-adding same cell
            if (lastCell && lastCell.row === rowIndex && lastCell.col === colIndex) {
                return;
            }

            // Backtracking
            const existingIndex = selectedCells.findIndex(c => c.row === rowIndex && c.col === colIndex);
            if (existingIndex !== -1) {
                if (existingIndex === selectedCells.length - 2) {
                    setSelectedCells(prev => prev.slice(0, -1));

                    // Light vibration for backtracking
                    if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(15);
                }
                return;
            }

            // Validation Logic - allow any adjacent cell (multi-directional)
            if (lastCell) {
                const rowDiff = rowIndex - lastCell.row;
                const colDiff = colIndex - lastCell.col;

                // Must be adjacent (within 1 cell) but NOT the same cell
                const isAdjacent = Math.abs(rowDiff) <= 1 && Math.abs(colDiff) <= 1 && !(rowDiff === 0 && colDiff === 0);

                // Allow any adjacent cell - no direction restriction
                if (isAdjacent) {
                    setSelectedCells(prev => [...prev, { row: rowIndex, col: colIndex, letter }]);

                    // Progressive vibration - longer word = more intense feedback
                    const vibrationIntensity = Math.min(20 + selectedCells.length * 3, 40);
                    if (window.navigator && window.navigator.vibrate) {
                        window.navigator.vibrate(vibrationIntensity);
                    }
                }
            }
        }
    };

    const handleTouchEnd = () => {
        if (!interactive || !isTouchingRef.current) return;
        isTouchingRef.current = false;

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
                    // Combo celebration - multiple short bursts
                    window.navigator.vibrate([50, 50, 50, 50, 80]);
                } else if (wordLength >= 6) {
                    // Long word - double vibration
                    window.navigator.vibrate([40, 30, 60]);
                } else if (wordLength >= 3) {
                    // Valid word - single vibration
                    window.navigator.vibrate(50);
                }
            }

            // Delay clearing the selection to keep the trail visible longer
            // Longer delay for combos to showcase the achievement
            const clearDelay = comboLevel > 0 ? 800 : 500;
            setTimeout(() => {
                setSelectedCells([]);
            }, clearDelay);
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

    const handleMouseEnter = (rowIndex, colIndex, letter) => {
        if (!interactive || !isTouchingRef.current) return;



        // For mouse enter, we already know the target, so we can skip elementFromPoint logic if we refactor handleTouchMove
        // But to reuse handleTouchMove as is, we'd need coordinates. 
        // Let's just duplicate the logic for mouse enter to be safe and simple.

        const lastCell = selectedCells[selectedCells.length - 1];
        if (lastCell && lastCell.row === rowIndex && lastCell.col === colIndex) return;

        // Backtracking
        const existingIndex = selectedCells.findIndex(c => c.row === rowIndex && c.col === colIndex);
        if (existingIndex !== -1) {
            if (existingIndex === selectedCells.length - 2) {
                setSelectedCells(prev => prev.slice(0, -1));
            }
            return;
        }

        if (lastCell) {
            const rowDiff = rowIndex - lastCell.row;
            const colDiff = colIndex - lastCell.col;

            // Must be adjacent (within 1 cell) but NOT the same cell
            const isAdjacent = Math.abs(rowDiff) <= 1 && Math.abs(colDiff) <= 1 && !(rowDiff === 0 && colDiff === 0);

            // Allow any adjacent cell - no direction restriction
            if (isAdjacent) {
                setSelectedCells(prev => [...prev, { row: rowIndex, col: colIndex, letter }]);
            }
        }
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
        if (level === 0) {
            return {
                gradient: 'from-yellow-400 to-orange-500',
                border: 'border-yellow-300',
                shadow: 'shadow-lg',
                text: null
            };
        } else if (level === 1) {
            return {
                gradient: 'from-orange-400 to-red-500',
                border: 'border-orange-300',
                shadow: 'shadow-[0_0_15px_rgba(251,146,60,0.6)]',
                text: 'x2'
            };
        } else if (level === 2) {
            return {
                gradient: 'from-red-400 to-pink-500',
                border: 'border-red-300',
                shadow: 'shadow-[0_0_20px_rgba(239,68,68,0.7)]',
                text: 'x3'
            };
        } else if (level === 3) {
            return {
                gradient: 'from-pink-400 to-purple-500',
                border: 'border-pink-300',
                shadow: 'shadow-[0_0_25px_rgba(236,72,153,0.8)]',
                text: 'x4'
            };
        } else if (level === 4) {
            return {
                gradient: 'from-purple-400 via-pink-500 to-red-500',
                border: 'border-purple-300',
                shadow: 'shadow-[0_0_30px_rgba(168,85,247,0.9)]',
                text: 'x5'
            };
        } else {
            // Level 5+: Epic rainbow/fire combo
            return {
                gradient: 'from-purple-400 via-pink-500 to-yellow-400 animate-gradient-x',
                border: 'border-yellow-300',
                shadow: 'shadow-[0_0_35px_rgba(250,204,21,1)]',
                text: `x${level + 1}`
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
            {/* Combo Indicator - Modern, compact, doesn't hide board */}
            <AnimatePresence mode="wait">
                {comboLevel > 0 && comboColors.text && (
                    <motion.div
                        key={`combo-${comboLevel}`}
                        initial={{ scale: 0, opacity: 0, y: 10 }}
                        animate={{
                            scale: [0, 1.2, 1],
                            opacity: 1,
                            y: 0,
                        }}
                        exit={{
                            scale: 0.8,
                            opacity: 0,
                            y: -10,
                            transition: { duration: 0.2 }
                        }}
                        transition={{
                            duration: 0.4,
                            ease: "easeOut"
                        }}
                        className="absolute -top-8 right-0 z-50 pointer-events-none"
                    >
                        <div className={cn(
                            "px-3 py-1 rounded-full font-extrabold text-sm text-white backdrop-blur-sm",
                            `bg-gradient-to-r ${comboColors.gradient}`,
                            comboColors.shadow,
                            "border-2 border-white/30"
                        )}>
                            🔥 {comboColors.text}
                        </div>
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
                                transition={{ duration: 0.2, ease: "easeOut" }}
                            />
                        );
                    })}
                </svg>
            )}

            <div
                ref={gridRef}
                className={cn(
                    "grid touch-none select-none relative rounded-2xl p-2 sm:p-3 md:p-4 aspect-square w-full max-w-[min(90vh,90vw)]",
                    isLargeGrid ? "gap-1 sm:gap-1.5" : "gap-2 sm:gap-3",
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
            >
            {grid.map((row, i) =>
                row.map((cell, j) => {
                    const isSelected = selectedCells.some(c => c.row === i && c.col === j);
                    return (
                        <motion.div
                            key={`${i}-${j}`}
                            data-row={i}
                            data-col={j}
                            data-letter={cell}
                            onTouchStart={(e) => handleTouchStart(i, j, cell, e)}
                            onMouseDown={(e) => handleMouseDown(i, j, cell, e)}
                            onMouseEnter={() => handleMouseEnter(i, j, cell)}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{
                                scale: isSelected ? 1.15 : 1,
                                opacity: 1,
                                rotate: isSelected ? [0, -5, 5, 0] : 0,
                                y: isSelected ? -2 : 0
                            }}
                            whileTap={{ scale: 0.95 }}
                            transition={{
                                duration: isSelected ? 0.2 : 0.6,
                                ease: "easeOut",
                                scale: { type: "spring", stiffness: 300, damping: 20 }
                            }}
                            className={cn(
                                "aspect-square flex items-center justify-center font-bold shadow-lg cursor-pointer transition-all duration-200 border-2 relative overflow-hidden",
                                isLargeGrid
                                    ? (largeText ? "text-2xl sm:text-3xl rounded-lg" : "text-lg sm:text-xl rounded-lg")
                                    : (largeText || playerView ? "text-4xl sm:text-5xl md:text-6xl rounded-2xl" : "text-2xl sm:text-3xl rounded-xl"),
                                isSelected
                                    ? `bg-gradient-to-br ${comboColors.gradient} text-white ${comboColors.border} z-10 ${comboColors.shadow} border-white/40`
                                    : "bg-gradient-to-br from-slate-100 via-white to-slate-100 dark:from-slate-700 dark:via-slate-800 dark:to-slate-900 text-slate-900 dark:text-white border-slate-300/60 dark:border-slate-600/60 hover:scale-105 hover:shadow-xl dark:hover:bg-slate-700/80 active:scale-95 shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
                            )}
                        >
                            {/* Ripple effect on selection */}
                            {isSelected && (
                                <>
                                    {/* Main ripple effect */}
                                    <motion.div
                                        className="absolute inset-0 bg-white/40 rounded-2xl"
                                        initial={{ scale: 0.5, opacity: 0.8 }}
                                        animate={{ scale: 2.5, opacity: 0 }}
                                        transition={{ duration: 0.6, ease: "easeOut" }}
                                    />

                                    {/* Bright flare effect - always visible on click */}
                                    <motion.div
                                        className="absolute inset-0 rounded-2xl pointer-events-none"
                                        style={{
                                            background: 'radial-gradient(circle at center, rgba(255, 255, 255, 0.9), transparent 70%)',
                                            filter: 'blur(2px)'
                                        }}
                                        initial={{ scale: 0, opacity: 1 }}
                                        animate={{ scale: [0, 1.5, 0], opacity: [1, 0.5, 0] }}
                                        transition={{ duration: 0.8, ease: "easeOut" }}
                                    />

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
                                                        duration: 0.6,
                                                        ease: "easeOut",
                                                        delay: idx * 0.02
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
                                                    duration: 0.6,
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
                                                    duration: 0.7,
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
                                                    duration: 0.65,
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
                                                    duration: 0.8,
                                                    repeat: Infinity,
                                                    ease: "easeInOut",
                                                    delay: 0.3
                                                }}
                                            />

                                            {/* Pulsing glow effect for high combos */}
                                            {comboLevel >= 2 && (
                                                <motion.div
                                                    className="absolute inset-0 rounded-lg pointer-events-none"
                                                    style={{
                                                        background: `radial-gradient(circle, ${comboLevel >= 4 ? 'rgba(168,85,247,0.4)' : 'rgba(255,107,0,0.3)'}, transparent)`,
                                                        filter: 'blur(3px)'
                                                    }}
                                                    animate={{
                                                        scale: [1, 1.3, 1],
                                                        opacity: [0.5, 0.8, 0.5],
                                                    }}
                                                    transition={{
                                                        duration: 1,
                                                        repeat: Infinity,
                                                        ease: "easeInOut"
                                                    }}
                                                />
                                            )}
                                        </>
                                    )}
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
