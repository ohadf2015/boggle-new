import { useState, useRef, useCallback, useEffect } from 'react';
import { getDeadzoneThreshold } from '../../utils/consts';

const noOp = () => {};

// Selection threshold - must be within this % of cell center to select
const CELL_SELECTION_THRESHOLD = 0.85;

/**
 * Custom hook for grid interaction logic (touch/mouse drag selection)
 * Extracted from GridComponent for better maintainability
 */
export function useGridInteraction({
    grid,
    interactive,
    externalSelectedCells,
    onWordSubmit,
    comboLevel,
    onFadeStart,
}) {
    const [internalSelectedCells, setInternalSelectedCells] = useState([]);
    const [fadingCells, setFadingCells] = useState([]);

    const isTouchingRef = useRef(false);
    const gridRef = useRef(null);
    const startPosRef = useRef({ x: 0, y: 0 });
    const hasMovedRef = useRef(false);
    const autoSubmitTimeoutRef = useRef(null);
    const startCellRef = useRef(null);
    const fadeTimeoutRef = useRef(null);

    // Use external control if provided, otherwise internal state
    const selectedCells = externalSelectedCells || internalSelectedCells;
    const setSelectedCells = externalSelectedCells ? noOp : setInternalSelectedCells;

    // Check if two cells are adjacent (8 directions including diagonals)
    const isAdjacentCell = useCallback((cell1, cell2) => {
        const rowDiff = Math.abs(cell1.row - cell2.row);
        const colDiff = Math.abs(cell1.col - cell2.col);
        return rowDiff <= 1 && colDiff <= 1 && (rowDiff > 0 || colDiff > 0);
    }, []);

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

        const lastCellInRow = gridRef.current.children[cols - 1];
        const gapX = lastCellInRow
            ? (lastCellInRow.getBoundingClientRect().left - firstCellRect.left - (cols - 1) * cellWidth) / Math.max(1, cols - 1)
            : 0;

        const firstCellInSecondRow = rows > 1 ? gridRef.current.children[cols] : null;
        const gapY = firstCellInSecondRow
            ? (firstCellInSecondRow.getBoundingClientRect().top - firstCellRect.top - cellHeight)
            : gapX;

        const cellWithGapWidth = cellWidth + gapX;
        const cellWithGapHeight = cellHeight + gapY;

        const adjustedX = touchX - gridRect.left - gridPaddingLeft;
        const adjustedY = touchY - gridRect.top - gridPaddingTop;

        const col = Math.floor(adjustedX / cellWithGapWidth);
        const row = Math.floor(adjustedY / cellWithGapHeight);

        if (row < 0 || row >= rows || col < 0 || col >= cols) return null;

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
            cellRadius: Math.min(cellWidth, cellHeight) / 2
        };
    }, [grid]);

    // Sequential fade-out animation
    const startSequentialFadeOut = useCallback((isCombo = false) => {
        if (selectedCells.length === 0) return;

        if (fadeTimeoutRef.current) {
            clearTimeout(fadeTimeoutRef.current);
            fadeTimeoutRef.current = null;
        }

        const cellsToFade = [...selectedCells];
        setFadingCells(cellsToFade);

        const cellFadeDelay = isCombo ? 120 : 80;
        const initialHold = isCombo ? 500 : 0;

        cellsToFade.forEach((cell, index) => {
            setTimeout(() => {
                setFadingCells(prev => prev.filter(c => !(c.row === cell.row && c.col === cell.col)));
            }, initialHold + index * cellFadeDelay);
        });

        const totalDelay = initialHold + cellsToFade.length * cellFadeDelay + (isCombo ? 800 : 200);
        fadeTimeoutRef.current = setTimeout(() => {
            if (!isTouchingRef.current) {
                setSelectedCells([]);
                setFadingCells([]);
            }
            fadeTimeoutRef.current = null;
        }, totalDelay);
    }, [selectedCells, setSelectedCells]);

    // Reset selection state
    const resetSelectionState = useCallback(() => {
        startCellRef.current = null;
    }, []);

    // Auto-focus on grid when game becomes interactive
    useEffect(() => {
        if (interactive && gridRef.current) {
            gridRef.current.focus();
        }
    }, [interactive]);

    // Auto-validation for combo words
    useEffect(() => {
        if (!interactive || comboLevel === 0 || selectedCells.length === 0) {
            if (autoSubmitTimeoutRef.current) {
                clearTimeout(autoSubmitTimeoutRef.current);
                autoSubmitTimeoutRef.current = null;
            }
            return;
        }

        if (selectedCells.length >= 3) {
            if (autoSubmitTimeoutRef.current) {
                clearTimeout(autoSubmitTimeoutRef.current);
            }

            autoSubmitTimeoutRef.current = setTimeout(() => {
                if (selectedCells.length >= 3 && isTouchingRef.current) {
                    const formedWord = selectedCells.map(c => c.letter).join('');
                    if (onWordSubmit) {
                        onWordSubmit(formedWord);
                    }
                    startSequentialFadeOut(true);
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

    // Global mouse up handler
    useEffect(() => {
        const handleGlobalMouseUp = () => {
            if (!interactive || !isTouchingRef.current) return;
            isTouchingRef.current = false;

            if (autoSubmitTimeoutRef.current) {
                clearTimeout(autoSubmitTimeoutRef.current);
                autoSubmitTimeoutRef.current = null;
            }

            resetSelectionState();

            if (selectedCells.length > 0 && (hasMovedRef.current || selectedCells.length >= 2)) {
                const formedWord = selectedCells.map(c => c.letter).join('');
                if (onWordSubmit) {
                    onWordSubmit(formedWord);
                }

                if (window.navigator && window.navigator.vibrate) {
                    const wordLength = selectedCells.length;
                    if (comboLevel > 0) {
                        if (comboLevel >= 7) {
                            window.navigator.vibrate([100, 50, 100, 50, 100, 50, 150]);
                        } else if (comboLevel >= 5) {
                            window.navigator.vibrate([80, 40, 80, 40, 120]);
                        } else if (comboLevel >= 3) {
                            window.navigator.vibrate([60, 40, 60, 40, 100]);
                        } else if (comboLevel >= 1) {
                            window.navigator.vibrate([50, 30, 50, 30, 80]);
                        }
                    } else if (wordLength >= 6) {
                        window.navigator.vibrate([40, 30, 60]);
                    } else if (wordLength >= 3) {
                        window.navigator.vibrate(50);
                    }
                }

                if (comboLevel > 0) {
                    startSequentialFadeOut(true);
                } else {
                    setTimeout(() => {
                        setSelectedCells([]);
                    }, 500);
                }
            } else {
                setSelectedCells([]);
            }

            hasMovedRef.current = false;
        };

        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }, [selectedCells, comboLevel, interactive, onWordSubmit, resetSelectionState, setSelectedCells, startSequentialFadeOut]);

    const handleTouchStart = useCallback((rowIndex, colIndex, letter, event) => {
        if (!interactive) return;
        isTouchingRef.current = true;
        hasMovedRef.current = false;

        if (fadeTimeoutRef.current) {
            clearTimeout(fadeTimeoutRef.current);
            fadeTimeoutRef.current = null;
        }

        setFadingCells([]);

        const touch = event.touches?.[0] || event;
        startPosRef.current = { x: touch.clientX, y: touch.clientY };
        startCellRef.current = { row: rowIndex, col: colIndex, letter };
        setSelectedCells([{ row: rowIndex, col: colIndex, letter }]);

        if (window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate(30);
        }
    }, [interactive, setSelectedCells]);

    const handleTouchMove = useCallback((e) => {
        if (!interactive || !isTouchingRef.current) return;
        if (e.cancelable) e.preventDefault();

        const touch = e.touches[0];
        const touchX = touch.clientX;
        const touchY = touch.clientY;

        const deltaX = touchX - startPosRef.current.x;
        const deltaY = touchY - startPosRef.current.y;
        const totalMovement = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        if (!hasMovedRef.current && totalMovement < getDeadzoneThreshold()) {
            return;
        }
        hasMovedRef.current = true;

        const currentCell = getCellAtPosition(touchX, touchY);
        if (!currentCell) return;

        const lastCell = selectedCells[selectedCells.length - 1];
        if (!lastCell) return;

        if (currentCell.row === lastCell.row && currentCell.col === lastCell.col) {
            return;
        }

        const selectionThreshold = currentCell.cellRadius * CELL_SELECTION_THRESHOLD;
        if (currentCell.distanceFromCenter > selectionThreshold) {
            return;
        }

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

        if (isAdjacentCell(lastCell, currentCell)) {
            const newSelection = [...selectedCells, { row: currentCell.row, col: currentCell.col, letter: currentCell.letter }];
            setSelectedCells(newSelection);
            if (window.navigator?.vibrate) {
                const intensity = Math.min(20 + newSelection.length * 3 + comboLevel * 5, 60);
                window.navigator.vibrate(intensity);
            }
        }
    }, [interactive, selectedCells, getCellAtPosition, isAdjacentCell, comboLevel, setSelectedCells]);

    const handleTouchEnd = useCallback(() => {
        if (!interactive || !isTouchingRef.current) return;
        isTouchingRef.current = false;

        if (autoSubmitTimeoutRef.current) {
            clearTimeout(autoSubmitTimeoutRef.current);
            autoSubmitTimeoutRef.current = null;
        }

        resetSelectionState();

        if (selectedCells.length > 0 && (hasMovedRef.current || selectedCells.length >= 2)) {
            const formedWord = selectedCells.map(c => c.letter).join('');
            if (onWordSubmit) {
                onWordSubmit(formedWord);
            }

            if (window.navigator && window.navigator.vibrate) {
                const wordLength = selectedCells.length;
                if (comboLevel > 0) {
                    if (comboLevel >= 7) {
                        window.navigator.vibrate([100, 50, 100, 50, 100, 50, 150]);
                    } else if (comboLevel >= 5) {
                        window.navigator.vibrate([80, 40, 80, 40, 120]);
                    } else if (comboLevel >= 3) {
                        window.navigator.vibrate([60, 40, 60, 40, 100]);
                    } else if (comboLevel >= 1) {
                        window.navigator.vibrate([50, 30, 50, 30, 80]);
                    }
                } else if (wordLength >= 6) {
                    window.navigator.vibrate([40, 30, 60]);
                } else if (wordLength >= 3) {
                    window.navigator.vibrate(50);
                }
            }

            if (comboLevel > 0) {
                startSequentialFadeOut(true);
            } else {
                setTimeout(() => {
                    setSelectedCells([]);
                }, 500);
            }
        } else {
            setSelectedCells([]);
        }

        hasMovedRef.current = false;
    }, [interactive, selectedCells, comboLevel, onWordSubmit, resetSelectionState, setSelectedCells, startSequentialFadeOut]);

    const handleMouseDown = useCallback((rowIndex, colIndex, letter, event) => {
        handleTouchStart(rowIndex, colIndex, letter, event);
    }, [handleTouchStart]);

    const handleMouseMove = useCallback((e) => {
        if (!interactive || !isTouchingRef.current) return;

        const mockEvent = {
            touches: [{ clientX: e.clientX, clientY: e.clientY }],
            cancelable: true,
            preventDefault: () => {}
        };
        handleTouchMove(mockEvent);
    }, [interactive, handleTouchMove]);

    return {
        gridRef,
        selectedCells,
        fadingCells,
        handleTouchStart,
        handleTouchMove,
        handleTouchEnd,
        handleMouseDown,
        handleMouseMove,
    };
}

export default useGridInteraction;
