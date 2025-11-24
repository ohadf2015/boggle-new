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

    // Use external control if provided, otherwise internal state
    const selectedCells = externalSelectedCells || internalSelectedCells;
    const setSelectedCells = externalSelectedCells ? () => { } : setInternalSelectedCells;

    // Auto-focus on grid when game becomes interactive
    useEffect(() => {
        if (interactive && gridRef.current) {
            gridRef.current.focus();
        }
    }, [interactive]);

    const handleTouchStart = (rowIndex, colIndex, letter) => {
        if (!interactive) return;
        isTouchingRef.current = true;
        setSelectedCells([{ row: rowIndex, col: colIndex, letter }]);
        if (window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate(50);
        }
    };

    const handleTouchMove = (e) => {
        if (!interactive || !isTouchingRef.current) return;
        if (e.cancelable) e.preventDefault();

        const touch = e.touches[0];
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
                    if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(20);
                }
                return;
            }

            // Validation Logic - allow any adjacent cell (easier diagonal selection)
            if (lastCell) {
                const rowDiff = rowIndex - lastCell.row;
                const colDiff = colIndex - lastCell.col;

                // Must be adjacent (allows free movement in any direction) but NOT the same cell
                if (Math.abs(rowDiff) <= 1 && Math.abs(colDiff) <= 1 && !(rowDiff === 0 && colDiff === 0)) {
                    setSelectedCells(prev => [...prev, { row: rowIndex, col: colIndex, letter }]);
                    if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(50);
                }
            }
        }
    };

    const handleTouchEnd = () => {
        if (!interactive || !isTouchingRef.current) return;
        isTouchingRef.current = false;

        if (selectedCells.length > 0) {
            const formedWord = selectedCells.map(c => c.letter).join('');
            if (onWordSubmit) {
                onWordSubmit(formedWord);
            }
            setSelectedCells([]);
        }
    };

    // Mouse support for desktop testing
    const handleMouseDown = (rowIndex, colIndex, letter) => {
        handleTouchStart(rowIndex, colIndex, letter);
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

            // Must be adjacent (allows free movement in any direction) but NOT the same cell
            if (Math.abs(rowDiff) <= 1 && Math.abs(colDiff) <= 1 && !(rowDiff === 0 && colDiff === 0)) {
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

    return (
        <div className="relative">
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

            <div
                ref={gridRef}
                className={cn(
                    "grid touch-none select-none",
                    isLargeGrid ? "gap-0.5 sm:gap-1" : "gap-1 sm:gap-2",
                    className
                )}
                style={{
                    gridTemplateColumns: `repeat(${grid[0]?.length || 4}, minmax(0, 1fr))`
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
                            onTouchStart={() => handleTouchStart(i, j, cell)}
                            onMouseDown={() => handleMouseDown(i, j, cell)}
                            onMouseEnter={() => handleMouseEnter(i, j, cell)}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{
                                scale: isSelected ? 1.1 : 1,
                                opacity: 1,
                                rotate: isSelected ? [0, -5, 5, 0] : 0
                            }}
                            transition={{ duration: 0.2 }}
                            className={cn(
                                "aspect-square flex items-center justify-center font-bold shadow-sm cursor-pointer transition-all duration-200 border",
                                isLargeGrid
                                    ? (largeText ? "text-2xl sm:text-3xl rounded-md" : "text-lg sm:text-xl rounded-md")
                                    : (largeText || playerView ? "text-4xl sm:text-6xl rounded-xl" : "text-2xl sm:text-3xl rounded-lg"),
                                isSelected
                                    ? `bg-gradient-to-br ${comboColors.gradient} text-white ${comboColors.border} z-10 ${comboColors.shadow}`
                                    : "bg-gradient-to-br from-white to-slate-100 dark:from-slate-800 dark:to-slate-900 text-slate-900 dark:text-white border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/80"
                            )}
                        >
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
