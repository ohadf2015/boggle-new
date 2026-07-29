'use client';

/**
 * PixelCanvas — touch-friendly pixel art grid for drawing.
 * Tap cells to paint, drag to paint multiple cells.
 * 8-color palette + eraser.
 */

import { memo, useState, useCallback, useRef, useEffect } from 'react';

// ==================== Types ====================

type PixelColor = number;
type PixelGrid = PixelColor[][];

interface PixelCanvasProps {
  gridSize: number;
  initialGrid?: PixelGrid;
  /** Row range to allow editing (for relay builder mode). Null = full grid */
  editableRange?: { startRow: number; endRow: number } | null;
  /** Read-only display mode */
  readOnly?: boolean;
  /** Called whenever the grid changes */
  onChange?: (grid: PixelGrid) => void;
  /** Max width/height in pixels */
  maxSize?: number;
}

// Neo-brutalist color palette
const COLORS = [
  'transparent',  // 0 = empty/eraser
  '#FFFEF0',      // 1 = cream/white
  '#1a1a2e',      // 2 = dark navy
  '#FF1493',      // 3 = neo-pink
  '#00FFFF',      // 4 = neo-cyan
  '#BFFF00',      // 5 = neo-lime
  '#8B5CF6',      // 6 = neo-purple
  '#FF3366',      // 7 = neo-red
];

const COLOR_NAMES = ['Eraser', 'White', 'Black', 'Pink', 'Cyan', 'Lime', 'Purple', 'Red'];

// ==================== Component ====================

function PixelCanvasInner({
  gridSize,
  initialGrid,
  editableRange = null,
  readOnly = false,
  onChange,
  maxSize = 320,
}: PixelCanvasProps) {
  const [grid, setGrid] = useState<PixelGrid>(() =>
    initialGrid || Array.from({ length: gridSize }, () => Array(gridSize).fill(0))
  );
  const [activeColor, setActiveColor] = useState<PixelColor>(1);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const lastPaintedCell = useRef<string | null>(null);

  // Sync initial grid
  useEffect(() => {
    if (initialGrid) setGrid(initialGrid);
  }, [initialGrid]);

  const cellSize = Math.floor(maxSize / gridSize);
  const totalSize = cellSize * gridSize;

  const isEditable = useCallback((row: number) => {
    if (readOnly) return false;
    if (!editableRange) return true;
    return row >= editableRange.startRow && row < editableRange.endRow;
  }, [readOnly, editableRange]);

  const paintCell = useCallback((row: number, col: number) => {
    if (!isEditable(row)) return;
    const key = `${row},${col}`;
    if (lastPaintedCell.current === key) return;
    lastPaintedCell.current = key;

    setGrid(prev => {
      const next = prev.map(r => [...r]);
      next[row][col] = activeColor;
      onChange?.(next);
      return next;
    });
  }, [activeColor, isEditable, onChange]);

  const getCellFromEvent = useCallback((e: React.PointerEvent | PointerEvent): { row: number; col: number } | null => {
    if (!canvasRef.current) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e as React.PointerEvent).clientX - rect.left;
    const y = (e as React.PointerEvent).clientY - rect.top;
    const col = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize);
    if (row < 0 || row >= gridSize || col < 0 || col >= gridSize) return null;
    return { row, col };
  }, [cellSize, gridSize]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (readOnly) return;
    e.preventDefault();
    setIsDrawing(true);
    lastPaintedCell.current = null;
    const cell = getCellFromEvent(e);
    if (cell) paintCell(cell.row, cell.col);
  }, [readOnly, getCellFromEvent, paintCell]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDrawing || readOnly) return;
    e.preventDefault();
    const cell = getCellFromEvent(e);
    if (cell) paintCell(cell.row, cell.col);
  }, [isDrawing, readOnly, getCellFromEvent, paintCell]);

  const handlePointerUp = useCallback(() => {
    setIsDrawing(false);
    lastPaintedCell.current = null;
  }, []);

  const handleUndo = useCallback(() => {
    setGrid(prev => {
      const next = prev.map(r => [...r]);
      // Simple undo: clear last non-empty cell (basic)
      for (let r = gridSize - 1; r >= 0; r--) {
        for (let c = gridSize - 1; c >= 0; c--) {
          if (next[r][c] !== 0 && isEditable(r)) {
            next[r][c] = 0;
            onChange?.(next);
            return next;
          }
        }
      }
      return prev;
    });
  }, [gridSize, isEditable, onChange]);

  const handleClear = useCallback(() => {
    const cleared = Array.from({ length: gridSize }, (_, r) =>
      Array.from({ length: gridSize }, (_, c) =>
        isEditable(r) ? 0 : (grid[r]?.[c] || 0)
      )
    );
    setGrid(cleared);
    onChange?.(cleared);
  }, [gridSize, isEditable, grid, onChange]);

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Canvas Grid */}
      <div
        ref={canvasRef}
        className="border-3 border-neo-black rounded-neo shadow-hard bg-neo-navy-elevated touch-none select-none"
        style={{ width: totalSize, height: totalSize }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${gridSize}, ${cellSize}px)`,
            gridTemplateRows: `repeat(${gridSize}, ${cellSize}px)`,
          }}
        >
          {grid.map((row, r) =>
            row.map((color, c) => {
              const editable = isEditable(r);
              const bgColor = color === 0 ? 'transparent' : COLORS[color] || 'transparent';
              return (
                <div
                  key={`${r}-${c}`}
                  className={`border border-neo-cream/5 ${!editable && editableRange ? 'opacity-30' : ''}`}
                  style={{
                    width: cellSize,
                    height: cellSize,
                    backgroundColor: bgColor,
                  }}
                />
              );
            })
          )}
        </div>
      </div>

      {/* Color Palette + Tools (hidden in read-only) */}
      {!readOnly && (
        <div className="flex flex-col items-center gap-2">
          {/* Color buttons */}
          <div className="flex gap-1.5 flex-wrap justify-center">
            {COLORS.map((hex, i) => (
              <button
                key={hex}
                onClick={() => setActiveColor(i)}
                title={COLOR_NAMES[i]}
                className={`
                  w-9 h-9 rounded-neo border-3
                  transition-all duration-100
                  ${activeColor === i
                    ? 'border-neo-cream shadow-hard scale-110'
                    : 'border-neo-black shadow-hard-sm hover:scale-105'
                  }
                `}
                style={{
                  backgroundColor: i === 0 ? '#2d2d44' : hex,
                  backgroundImage: i === 0 ? 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.1) 3px, rgba(255,255,255,0.1) 6px)' : undefined,
                }}
              >
                {i === 0 && <span className="text-neo-white text-xs">X</span>}
              </button>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleUndo}
              className="bg-neo-navy-elevated border-2 border-neo-cream/30 rounded-neo px-3 py-1.5 text-neo-white text-xs font-neo-body
                hover:border-neo-cream/50 active:translate-y-px transition-all"
            >
              Undo
            </button>
            <button
              onClick={handleClear}
              className="bg-neo-navy-elevated border-2 border-neo-red/30 rounded-neo px-3 py-1.5 text-neo-red/60 text-xs font-neo-body
                hover:border-neo-red/50 active:translate-y-px transition-all"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export const PixelCanvas = memo(PixelCanvasInner);
PixelCanvas.displayName = 'PixelCanvas';

/** Read-only pixel grid display for TV */
export function PixelGridDisplay({ grid, size = 200 }: { grid: PixelGrid; size?: number }) {
  const gridSize = grid.length;
  const cellSize = Math.floor(size / gridSize);

  return (
    <div
      className="border-3 border-neo-black rounded-neo shadow-hard overflow-hidden inline-block"
      style={{ width: cellSize * gridSize, height: cellSize * gridSize }}
    >
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${gridSize}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${gridSize}, ${cellSize}px)`,
        }}
      >
        {grid.map((row, r) =>
          row.map((color, c) => (
            <div
              key={`${r}-${c}`}
              style={{
                width: cellSize,
                height: cellSize,
                backgroundColor: color === 0 ? 'transparent' : COLORS[color] || 'transparent',
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}

export { COLORS };
export type { PixelGrid, PixelColor };
