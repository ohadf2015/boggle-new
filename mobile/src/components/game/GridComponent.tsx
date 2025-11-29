// GridComponent - Full-featured interactive letter grid with gesture handling
// Ported from fe-next/components/GridComponent.jsx
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  Dimensions,
  I18nManager,
  LayoutChangeEvent,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  runOnJS,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { HapticsService } from '../../features/haptics/HapticsService';
import { COLORS, getDeadzoneThreshold } from '../../constants/game';
import Svg, { Path } from 'react-native-svg';

interface Cell {
  row: number;
  col: number;
  letter: string;
}

interface GridComponentProps {
  grid: string[][];
  interactive?: boolean;
  onWordSubmit?: (word: string) => void;
  selectedCells?: Cell[];
  className?: string;
  largeText?: boolean;
  playerView?: boolean;
  comboLevel?: number;
  animateOnMount?: boolean;
  heatMapData?: {
    cellUsageCounts: Record<string, number>;
    maxCount: number;
  } | null;
}

// Check if two cells are adjacent (8 directions including diagonals)
const isAdjacentCell = (cell1: Cell, cell2: Cell): boolean => {
  const rowDiff = Math.abs(cell1.row - cell2.row);
  const colDiff = Math.abs(cell1.col - cell2.col);
  return rowDiff <= 1 && colDiff <= 1 && (rowDiff > 0 || colDiff > 0);
};

// Selection threshold - must be within this % of cell center to select
const CELL_SELECTION_THRESHOLD = 0.85; // 85% of cell radius

export default function GridComponent({
  grid,
  interactive = false,
  onWordSubmit,
  selectedCells: externalSelectedCells,
  largeText = false,
  playerView = false,
  comboLevel = 0,
  animateOnMount = false,
  heatMapData = null,
}: GridComponentProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const isRTL = I18nManager.isRTL;

  const [internalSelectedCells, setInternalSelectedCells] = useState<Cell[]>([]);
  const [fadingCells, setFadingCells] = useState<Cell[]>([]);

  const isTouchingRef = useRef(false);
  const gridRef = useRef<View>(null);
  const gridLayout = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const startPosRef = useRef({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);
  const autoSubmitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startCellRef = useRef<Cell | null>(null);
  const fadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Use external control if provided, otherwise internal state
  const selectedCells = externalSelectedCells || internalSelectedCells;
  const setSelectedCells = externalSelectedCells ? () => {} : setInternalSelectedCells;

  const rows = grid.length;
  const cols = grid[0]?.length || 0;
  const screenWidth = Dimensions.get('window').width;
  const gridSize = Math.min(screenWidth - 40, 500); // Max 500px with 20px padding on each side
  const cellSize = gridSize / cols;
  const isLargeGrid = cols > 8;

  // Sequential fade-out animation for combo trail
  const startSequentialFadeOut = useCallback((isCombo = false) => {
    if (selectedCells.length === 0) return;

    // Cancel any existing fade timeout
    if (fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current);
      fadeTimeoutRef.current = null;
    }

    // Copy selected cells for fading animation
    const cellsToFade = [...selectedCells];
    setFadingCells(cellsToFade);

    // Combo trails stay longer and fade slower
    const cellFadeDelay = isCombo ? 120 : 80;
    const initialHold = isCombo ? 500 : 0;

    // Fade out each cell sequentially
    cellsToFade.forEach((cell, index) => {
      setTimeout(() => {
        setFadingCells((prev) =>
          prev.filter((c) => !(c.row === cell.row && c.col === cell.col))
        );
      }, initialHold + index * cellFadeDelay);
    });

    // Clear all selections after animation completes
    const totalDelay = initialHold + cellsToFade.length * cellFadeDelay + (isCombo ? 800 : 200);
    fadeTimeoutRef.current = setTimeout(() => {
      if (!isTouchingRef.current) {
        setSelectedCells([]);
        setFadingCells([]);
      }
      fadeTimeoutRef.current = null;
    }, totalDelay);
  }, [selectedCells, setSelectedCells]);

  // Auto-validation for combo words
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
      if (autoSubmitTimeoutRef.current) {
        clearTimeout(autoSubmitTimeoutRef.current);
      }

      autoSubmitTimeoutRef.current = setTimeout(() => {
        if (selectedCells.length >= 3 && isTouchingRef.current) {
          const formedWord = selectedCells.map((c) => c.letter).join('');
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

  // Get cell at touch position with cell center distance info
  const getCellAtPosition = useCallback((touchX: number, touchY: number): Cell & { distanceFromCenter: number; cellRadius: number } | null => {
    const { x: gridX, y: gridY, width: gridWidth, height: gridHeight } = gridLayout.current;

    if (!gridWidth || !gridHeight) return null;

    const localX = touchX - gridX;
    const localY = touchY - gridY;

    if (localX < 0 || localY < 0 || localX >= gridWidth || localY >= gridHeight) {
      return null;
    }

    const col = Math.floor(localX / cellSize);
    const row = Math.floor(localY / cellSize);

    if (row < 0 || row >= rows || col < 0 || col >= cols) {
      return null;
    }

    // Calculate cell center for distance checking
    const cellCenterX = col * cellSize + cellSize / 2;
    const cellCenterY = row * cellSize + cellSize / 2;
    const distanceFromCenter = Math.sqrt(
      Math.pow(localX - cellCenterX, 2) + Math.pow(localY - cellCenterY, 2)
    );

    return {
      row,
      col,
      letter: grid[row][col],
      distanceFromCenter,
      cellRadius: Math.min(cellSize, cellSize) / 2,
    };
  }, [grid, cellSize, rows, cols]);

  // Handle touch/pan gesture
  const handleTouchStart = useCallback((rowIndex: number, colIndex: number, letter: string, x: number, y: number) => {
    if (!interactive) return;
    isTouchingRef.current = true;
    hasMovedRef.current = false;

    // Cancel any pending fade timeout
    if (fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current);
      fadeTimeoutRef.current = null;
    }

    // Clear any fading animation
    setFadingCells([]);

    // Store initial touch position for deadzone detection
    startPosRef.current = { x, y };

    // Store start cell
    startCellRef.current = { row: rowIndex, col: colIndex, letter };

    // Initialize selection
    setSelectedCells([{ row: rowIndex, col: colIndex, letter }]);

    // Haptic feedback
    HapticsService.letterSelect();
  }, [interactive, setSelectedCells]);

  const handleTouchMove = useCallback((x: number, y: number) => {
    if (!interactive || !isTouchingRef.current) return;

    const deltaX = x - startPosRef.current.x;
    const deltaY = y - startPosRef.current.y;
    const totalMovement = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Deadzone check
    if (!hasMovedRef.current && totalMovement < getDeadzoneThreshold()) {
      return;
    }
    hasMovedRef.current = true;

    // Get the cell currently under touch
    const currentCell = getCellAtPosition(x, y);
    if (!currentCell) return;

    const lastCell = selectedCells[selectedCells.length - 1];
    if (!lastCell) return;

    // Same cell - no change
    if (currentCell.row === lastCell.row && currentCell.col === lastCell.col) {
      return;
    }

    // Anti-accident mechanism: must be close enough to cell center
    const selectionThreshold = currentCell.cellRadius * CELL_SELECTION_THRESHOLD;
    if (currentCell.distanceFromCenter > selectionThreshold) {
      return;
    }

    // Backtracking: if cell already selected, remove cells after it
    const existingIndex = selectedCells.findIndex(
      (c) => c.row === currentCell.row && c.col === currentCell.col
    );

    if (existingIndex !== -1) {
      const newSelection = selectedCells.slice(0, existingIndex + 1);
      if (newSelection.length !== selectedCells.length) {
        setSelectedCells(newSelection);
        HapticsService.letterSelect();
      }
      return;
    }

    // New cell - check if adjacent
    if (isAdjacentCell(lastCell, currentCell)) {
      const newSelection = [
        ...selectedCells,
        { row: currentCell.row, col: currentCell.col, letter: currentCell.letter },
      ];
      setSelectedCells(newSelection);

      // Haptic with increasing intensity
      if (comboLevel > 0) {
        HapticsService.combo(comboLevel);
      } else {
        HapticsService.letterSelect();
      }
    }
  }, [interactive, selectedCells, getCellAtPosition, setSelectedCells, comboLevel]);

  const handleTouchEnd = useCallback(() => {
    if (!interactive || !isTouchingRef.current) return;
    isTouchingRef.current = false;

    // Clear auto-submit timeout
    if (autoSubmitTimeoutRef.current) {
      clearTimeout(autoSubmitTimeoutRef.current);
      autoSubmitTimeoutRef.current = null;
    }

    // Reset selection state
    startCellRef.current = null;

    // Misclick prevention: only submit if user has moved OR selected multiple letters
    if (selectedCells.length > 0 && (hasMovedRef.current || selectedCells.length >= 2)) {
      const formedWord = selectedCells.map((c) => c.letter).join('');
      if (onWordSubmit) {
        onWordSubmit(formedWord);
      }

      // Haptic feedback
      if (comboLevel > 0) {
        HapticsService.combo(comboLevel);
      } else {
        HapticsService.wordSubmit();
      }

      // Use sequential fade-out for combo words
      if (comboLevel > 0) {
        startSequentialFadeOut(true);
      } else {
        setTimeout(() => {
          setSelectedCells([]);
        }, 500);
      }
    } else {
      // Clear selection immediately if misclick
      setSelectedCells([]);
    }

    hasMovedRef.current = false;
  }, [interactive, selectedCells, onWordSubmit, comboLevel, setSelectedCells, startSequentialFadeOut]);

  // Pan gesture for word selection
  const panGesture = Gesture.Pan()
    .onStart((event) => {
      const cell = getCellAtPosition(event.absoluteX, event.absoluteY);
      if (cell) {
        runOnJS(handleTouchStart)(cell.row, cell.col, cell.letter, event.absoluteX, event.absoluteY);
      }
    })
    .onUpdate((event) => {
      runOnJS(handleTouchMove)(event.absoluteX, event.absoluteY);
    })
    .onEnd(() => {
      runOnJS(handleTouchEnd)();
    });

  // Get combo colors based on level
  const getComboColors = (level: number) => {
    if (level === 0) {
      return {
        bg: COLORS.neoYellow,
        border: COLORS.neoBlack,
        text: null,
      };
    } else if (level === 1) {
      return {
        bg: COLORS.neoOrange,
        border: COLORS.neoBlack,
        text: `+${Math.min(level, 5)}`,
      };
    } else if (level === 2) {
      return {
        bg: COLORS.neoRed,
        border: COLORS.neoBlack,
        text: `+${Math.min(level, 5)}`,
        textColor: COLORS.neoWhite,
      };
    } else if (level === 3) {
      return {
        bg: COLORS.neoPink,
        border: COLORS.neoBlack,
        text: `+${Math.min(level, 5)}`,
        textColor: COLORS.neoWhite,
      };
    } else if (level === 4) {
      return {
        bg: COLORS.neoPurple,
        border: COLORS.neoBlack,
        text: `+${Math.min(level, 5)}`,
        textColor: COLORS.neoWhite,
      };
    } else if (level === 5) {
      return {
        bg: COLORS.neoCyan,
        border: COLORS.neoBlack,
        text: `+${Math.min(level, 5)}`,
      };
    } else if (level === 6) {
      return {
        bg: COLORS.neoLime,
        border: COLORS.neoBlack,
        text: `+5`,
      };
    } else {
      // Rainbow for level 7+
      return {
        bg: null,
        isRainbow: true,
        border: COLORS.neoBlack,
        text: `+5`,
        textColor: COLORS.neoWhite,
      };
    }
  };

  const comboColors = getComboColors(comboLevel);

  // Get heat map style
  const getHeatMapStyle = (row: number, col: number) => {
    if (!heatMapData || !heatMapData.cellUsageCounts) return null;
    const key = `${row},${col}`;
    const count = heatMapData.cellUsageCounts[key] || 0;
    if (count === 0) return null;

    const maxCount = heatMapData.maxCount || 1;
    const t = count / maxCount;

    let r: number, g: number, b: number;

    if (t < 0.2) {
      const p = t / 0.2;
      r = Math.round(120 + p * 135);
      g = 0;
      b = Math.round(p * 30);
    } else if (t < 0.4) {
      const p = (t - 0.2) / 0.2;
      r = 255;
      g = Math.round(p * 50);
      b = Math.round(30 + p * 100);
    } else if (t < 0.6) {
      const p = (t - 0.4) / 0.2;
      r = 255;
      g = Math.round(50 + p * 100);
      b = Math.round(130 - p * 130);
    } else if (t < 0.8) {
      const p = (t - 0.6) / 0.2;
      r = 255;
      g = Math.round(150 + p * 105);
      b = 0;
    } else {
      const p = (t - 0.8) / 0.2;
      r = 255;
      g = 255;
      b = Math.round(p * 180);
    }

    return { r, g, b, t };
  };

  // Render a single cell
  const renderCell = (row: number, col: number) => {
    const letter = grid[row][col];
    const isSelected = selectedCells.some((c) => c.row === row && c.col === col);
    const isFirstSelected =
      selectedCells.length > 0 && selectedCells[0].row === row && selectedCells[0].col === col;
    const isFading = fadingCells.some((c) => c.row === row && c.col === col);
    const heatStyle = getHeatMapStyle(row, col);

    // Animated values for cell
    const scale = useSharedValue(1);
    const opacity = useSharedValue(1);

    useEffect(() => {
      if (isSelected) {
        scale.value = withSpring(1.08, {
          damping: 22,
          stiffness: 350,
        });
      } else if (isFading) {
        scale.value = withTiming(1.04);
      } else {
        scale.value = withSpring(1);
      }
    }, [isSelected, isFading]);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    }));

    // Cell background color
    let backgroundColor = isDark ? COLORS.neoGray : COLORS.neoWhite;
    let textColor = isDark ? COLORS.neoCream : COLORS.neoBlack;

    if (isSelected) {
      if (comboColors.isRainbow) {
        // Rainbow effect - will use gradient view
        backgroundColor = COLORS.neoPurple;
        textColor = comboColors.textColor || COLORS.neoBlack;
      } else {
        backgroundColor = comboColors.bg || COLORS.neoYellow;
        textColor = comboColors.textColor || COLORS.neoBlack;
      }
    }

    return (
      <Animated.View
        key={`${row}-${col}`}
        style={[
          styles.cell,
          {
            width: cellSize - 4,
            height: cellSize - 4,
            backgroundColor,
            borderColor: COLORS.neoBlack,
            borderWidth: isSelected ? 3 : 2,
          },
          animatedStyle,
        ]}
      >
        {/* Heat map overlay */}
        {heatStyle && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: `rgba(${heatStyle.r}, ${heatStyle.g}, ${heatStyle.b}, ${0.3 + heatStyle.t * 0.4})`,
              borderRadius: 4,
            }}
          />
        )}

        <Text
          style={[
            styles.letter,
            {
              color: textColor,
              fontSize: isLargeGrid
                ? largeText
                  ? cellSize * 0.4
                  : cellSize * 0.35
                : largeText || playerView
                ? cellSize * 0.5
                : cellSize * 0.4,
            },
          ]}
        >
          {letter}
        </Text>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Combo Indicator */}
      {comboLevel > 0 && comboColors.text && (
        <View style={styles.comboIndicator}>
          <View
            style={[
              styles.comboBadge,
              {
                backgroundColor: comboColors.bg || COLORS.neoPurple,
                borderColor: COLORS.neoBlack,
              },
            ]}
          >
            <Text style={[styles.comboText, { color: comboColors.textColor || COLORS.neoBlack }]}>
              {comboLevel >= 7 ? '🌈' : '🔥'} {comboColors.text}
            </Text>
          </View>
        </View>
      )}

      {/* Grid Container */}
      <View
        style={[
          styles.gridFrame,
          {
            backgroundColor: COLORS.neoCream,
            borderColor: `${COLORS.neoBlack}33`,
            transform: interactive ? [] : [{ rotate: '-2deg' }],
          },
        ]}
      >
        {/* Clipboard clip decoration */}
        <View style={styles.clipboardClip} />

        {/* Grid */}
        <GestureDetector gesture={panGesture}>
          <View
            ref={gridRef}
            style={[
              styles.grid,
              {
                width: gridSize,
                height: gridSize,
              },
            ]}
            onLayout={(event: LayoutChangeEvent) => {
              gridRef.current?.measureInWindow((x, y, width, height) => {
                gridLayout.current = { x, y, width, height };
              });
            }}
          >
            {grid.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.row}>
                {row.map((_, colIndex) => renderCell(rowIndex, colIndex))}
              </View>
            ))}
          </View>
        </GestureDetector>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  comboIndicator: {
    position: 'absolute',
    top: -60,
    alignSelf: 'center',
    zIndex: 50,
  },
  comboBadge: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
  },
  comboText: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 1,
  },
  gridFrame: {
    borderRadius: 12,
    borderWidth: 2,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
  },
  clipboardClip: {
    position: 'absolute',
    top: -8,
    alignSelf: 'center',
    width: 60,
    height: 16,
    backgroundColor: COLORS.neoBlack,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  grid: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    margin: 2,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 0,
    elevation: 4,
  },
  letter: {
    fontWeight: '900',
    textTransform: 'uppercase',
  },
});
