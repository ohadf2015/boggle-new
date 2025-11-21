import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

const GridComponent = ({
    grid,
    interactive = false,
    onWordSubmit,
    selectedCells: externalSelectedCells,
    className
}) => {
    const [internalSelectedCells, setInternalSelectedCells] = useState([]);
    const isTouchingRef = useRef(false);

    // Use external control if provided, otherwise internal state
    const selectedCells = externalSelectedCells || internalSelectedCells;
    const setSelectedCells = externalSelectedCells ? () => { } : setInternalSelectedCells;

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

            // Validation Logic
            if (lastCell) {
                const rowDiff = rowIndex - lastCell.row;
                const colDiff = colIndex - lastCell.col;

                // Must be adjacent
                if (Math.abs(rowDiff) <= 1 && Math.abs(colDiff) <= 1) {

                    // If we have more than 1 cell, enforce direction
                    if (selectedCells.length >= 2) {
                        const secondLastCell = selectedCells[selectedCells.length - 2];
                        const initialRowDiff = lastCell.row - secondLastCell.row;
                        const initialColDiff = lastCell.col - secondLastCell.col;

                        if (rowDiff === initialRowDiff && colDiff === initialColDiff) {
                            setSelectedCells(prev => [...prev, { row: rowIndex, col: colIndex, letter }]);
                            if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(50);
                        }
                    } else {
                        // First move defines direction
                        setSelectedCells(prev => [...prev, { row: rowIndex, col: colIndex, letter }]);
                        if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(50);
                    }
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

            if (Math.abs(rowDiff) <= 1 && Math.abs(colDiff) <= 1) {
                if (selectedCells.length >= 2) {
                    const secondLastCell = selectedCells[selectedCells.length - 2];
                    const initialRowDiff = lastCell.row - secondLastCell.row;
                    const initialColDiff = lastCell.col - secondLastCell.col;

                    if (rowDiff === initialRowDiff && colDiff === initialColDiff) {
                        setSelectedCells(prev => [...prev, { row: rowIndex, col: colIndex, letter }]);
                    }
                } else {
                    setSelectedCells(prev => [...prev, { row: rowIndex, col: colIndex, letter }]);
                }
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

    return (
        <div
            className={cn(
                "grid touch-none select-none",
                isLargeGrid ? "gap-0.5 sm:gap-1" : "gap-1 sm:gap-2",
                className
            )}
            style={{
                gridTemplateColumns: `repeat(${grid[0]?.length || 4}, minmax(0, 1fr))`
            }}
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
                                "aspect-square flex items-center justify-center font-bold shadow-sm cursor-pointer transition-colors border",
                                isLargeGrid ? "text-lg sm:text-xl rounded-md" : "text-2xl sm:text-3xl rounded-lg",
                                isSelected
                                    ? "bg-gradient-to-br from-yellow-400 to-orange-500 text-white border-yellow-300 z-10 shadow-lg"
                                    : "bg-gradient-to-br from-white to-slate-100 dark:from-slate-800 dark:to-slate-900 text-slate-900 dark:text-white border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/80"
                            )}
                        >
                            {cell}
                        </motion.div>
                    );
                })
            )}
        </div>
    );
};

export default GridComponent;
