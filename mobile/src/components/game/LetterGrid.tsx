// Interactive letter grid with gesture handling
import React, { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { HapticsService } from '../../features/haptics/HapticsService';
import { COLORS, getDeadzoneThreshold } from '../../constants/game';

interface Cell {
  row: number;
  col: number;
  letter: string;
}

interface LetterGridProps {
  grid: string[][];
  size: number;
  onWordSubmit: (word: string) => void;
  comboLevel: number;
}

// Check if two cells are adjacent (including diagonals)
const areAdjacent = (cell1: Cell, cell2: Cell): boolean => {
  const rowDiff = Math.abs(cell1.row - cell2.row);
  const colDiff = Math.abs(cell1.col - cell2.col);
  return rowDiff <= 1 && colDiff <= 1 && !(rowDiff === 0 && colDiff === 0);
};

export default function LetterGrid({ grid, size, onWordSubmit, comboLevel }: LetterGridProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const rows = grid.length;
  const cols = grid[0]?.length || 0;
  const cellSize = size / cols;
  const deadzoneThreshold = getDeadzoneThreshold();

  const [selectedCells, setSelectedCells] = useState<Cell[]>([]);
  const [currentWord, setCurrentWord] = useState('');
  const gridRef = useRef<View>(null);
  const gridLayout = useRef({ x: 0, y: 0, width: 0, height: 0 });

  // Get cell at position
  const getCellAtPosition = useCallback(
    (x: number, y: number): Cell | null => {
      const { x: gridX, y: gridY } = gridLayout.current;
      const localX = x - gridX;
      const localY = y - gridY;

      if (localX < 0 || localY < 0 || localX >= size || localY >= size) {
        return null;
      }

      const col = Math.floor(localX / cellSize);
      const row = Math.floor(localY / cellSize);

      if (row >= 0 && row < rows && col >= 0 && col < cols) {
        return { row, col, letter: grid[row][col] };
      }
      return null;
    },
    [grid, cellSize, rows, cols, size]
  );

  // Check if cell is already selected
  const isCellSelected = useCallback(
    (row: number, col: number): boolean => {
      return selectedCells.some((c) => c.row === row && c.col === col);
    },
    [selectedCells]
  );

  // Handle cell selection
  const selectCell = useCallback(
    (cell: Cell) => {
      // Check if this is the previous cell (backtracking)
      if (selectedCells.length >= 2) {
        const prevCell = selectedCells[selectedCells.length - 2];
        if (prevCell.row === cell.row && prevCell.col === cell.col) {
          // Backtrack
          const newSelected = selectedCells.slice(0, -1);
          setSelectedCells(newSelected);
          setCurrentWord(newSelected.map((c) => c.letter).join(''));
          HapticsService.letterSelect();
          return;
        }
      }

      // Check if cell is already selected
      if (isCellSelected(cell.row, cell.col)) {
        return;
      }

      // Check adjacency (except for first cell)
      if (selectedCells.length > 0) {
        const lastCell = selectedCells[selectedCells.length - 1];
        if (!areAdjacent(lastCell, cell)) {
          return;
        }
      }

      // Add cell to selection
      const newSelected = [...selectedCells, cell];
      setSelectedCells(newSelected);
      setCurrentWord(newSelected.map((c) => c.letter).join(''));
      HapticsService.letterSelect();
    },
    [selectedCells, isCellSelected]
  );

  // Submit word and reset
  const submitWord = useCallback(() => {
    if (currentWord.length >= 2) {
      onWordSubmit(currentWord);
    }
    setSelectedCells([]);
    setCurrentWord('');
  }, [currentWord, onWordSubmit]);

  // Pan gesture for word selection
  const panGesture = Gesture.Pan()
    .onStart((event) => {
      const cell = getCellAtPosition(event.absoluteX, event.absoluteY);
      if (cell) {
        runOnJS(setSelectedCells)([cell]);
        runOnJS(setCurrentWord)(cell.letter);
        runOnJS(HapticsService.letterSelect)();
      }
    })
    .onUpdate((event) => {
      const cell = getCellAtPosition(event.absoluteX, event.absoluteY);
      if (cell) {
        runOnJS(selectCell)(cell);
      }
    })
    .onEnd(() => {
      runOnJS(submitWord)();
    });

  // Get combo color
  const getComboColor = (level: number): string => {
    if (level <= 0) return COLORS.neoCyan;
    if (level === 1) return COLORS.neoYellow;
    if (level === 2) return COLORS.neoOrange;
    if (level >= 3) return COLORS.neoPink;
    return COLORS.neoCyan;
  };

  // Render a single cell
  const renderCell = (row: number, col: number) => {
    const letter = grid[row][col];
    const isSelected = isCellSelected(row, col);
    const selectionIndex = selectedCells.findIndex((c) => c.row === row && c.col === col);

    return (
      <Animated.View
        key={`${row}-${col}`}
        style={[
          styles.cell,
          {
            width: cellSize - 4,
            height: cellSize - 4,
            backgroundColor: isSelected
              ? getComboColor(comboLevel)
              : isDark
              ? '#2A2A2A'
              : '#FFFFFF',
            borderColor: COLORS.neoBlack,
          },
        ]}
      >
        <Text
          style={[
            styles.letter,
            {
              color: isSelected ? COLORS.neoBlack : isDark ? COLORS.neoCream : COLORS.neoBlack,
              fontSize: cellSize * 0.5,
            },
          ]}
        >
          {letter}
        </Text>
        {isSelected && selectionIndex >= 0 && (
          <View style={styles.selectionBadge}>
            <Text style={styles.selectionNumber}>{selectionIndex + 1}</Text>
          </View>
        )}
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Current word display */}
      {currentWord.length > 0 && (
        <View style={[styles.wordPreview, { backgroundColor: getComboColor(comboLevel) }]}>
          <Text style={styles.wordPreviewText}>{currentWord}</Text>
        </View>
      )}

      {/* Grid */}
      <GestureDetector gesture={panGesture}>
        <View
          ref={gridRef}
          style={[styles.grid, { width: size, height: size }]}
          onLayout={(event) => {
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
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  wordPreview: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: COLORS.neoBlack,
    marginBottom: 15,
    minWidth: 100,
    alignItems: 'center',
  },
  wordPreviewText: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.neoBlack,
    letterSpacing: 2,
  },
  grid: {
    borderWidth: 3,
    borderColor: COLORS.neoBlack,
    borderRadius: 12,
    overflow: 'hidden',
    padding: 2,
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    margin: 2,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: {
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  selectionBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: COLORS.neoBlack,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionNumber: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.neoCream,
  },
});
