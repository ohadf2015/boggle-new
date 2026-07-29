'use client';

/**
 * DrawingCanvas — Freehand drawing wrapper around react-sketch-canvas.
 * SVG-based, touch/pen/mouse friendly, exports CanvasPath[] for wire transfer.
 */

import { memo, useRef, useCallback, useEffect, useImperativeHandle, forwardRef, useState } from 'react';
import { ReactSketchCanvas, type CanvasPath, type ReactSketchCanvasRef } from 'react-sketch-canvas';
import { useLanguage } from '@/contexts/LanguageContext';

// ==================== Types ====================

/** Re-export CanvasPath as the wire format */
export type DrawingData = CanvasPath[];

export interface DrawingCanvasHandle {
  exportPaths: () => Promise<DrawingData>;
  clearCanvas: () => void;
  undo: () => void;
  redo: () => void;
}

interface DrawingCanvasProps {
  /** Canvas width in CSS pixels */
  width?: number;
  /** Canvas height in CSS pixels */
  height?: number;
  /** Initial paths to render (for displaying others' drawings) */
  initialPaths?: DrawingData;
  /** Read-only display mode */
  readOnly?: boolean;
  /** Called whenever a stroke completes */
  onStrokeEnd?: (paths: DrawingData) => void;
  /** Called on each pointer move during drawing (for live streaming) */
  onStrokeUpdate?: (paths: DrawingData) => void;
}

// Neo-brutalist color palette
const COLORS = [
  '#FFFEF0', // cream/white
  '#1a1a2e', // dark navy
  '#FF1493', // neo-pink
  '#00FFFF', // neo-cyan
  '#BFFF00', // neo-lime
  '#8B5CF6', // neo-purple
  '#FF3366', // neo-red
  '#FF8C00', // orange
];

const BRUSH_SIZES = [3, 6, 12, 24];

// ==================== Component ====================

const DrawingCanvasInner = forwardRef<DrawingCanvasHandle, DrawingCanvasProps>(({
  width = 320,
  height = 320,
  initialPaths,
  readOnly = false,
  onStrokeEnd,
  onStrokeUpdate,
}, ref) => {
  const { t } = useLanguage();
  const canvasRef = useRef<ReactSketchCanvasRef>(null);
  const [activeColor, setActiveColor] = useState(COLORS[0]);
  const [brushSize, setBrushSize] = useState(BRUSH_SIZES[1]);
  const [isEraser, setIsEraser] = useState(false);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    exportPaths: async () => {
      if (!canvasRef.current) return [];
      return canvasRef.current.exportPaths();
    },
    clearCanvas: () => canvasRef.current?.clearCanvas(),
    undo: () => canvasRef.current?.undo(),
    redo: () => canvasRef.current?.redo(),
  }), []);

  // Load initial paths
  useEffect(() => {
    if (initialPaths && canvasRef.current) {
      canvasRef.current.resetCanvas();
      canvasRef.current.loadPaths(initialPaths);
    }
  }, [initialPaths]);

  // Toggle eraser mode
  useEffect(() => {
    canvasRef.current?.eraseMode(isEraser);
  }, [isEraser]);

  const handleStrokeEnd = useCallback(async () => {
    if (!canvasRef.current || !onStrokeEnd) return;
    const paths = await canvasRef.current.exportPaths();
    onStrokeEnd(paths);
  }, [onStrokeEnd]);

  const handleOnChange = useCallback(async () => {
    if (!canvasRef.current || !onStrokeUpdate) return;
    const paths = await canvasRef.current.exportPaths();
    onStrokeUpdate(paths);
  }, [onStrokeUpdate]);

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Canvas */}
      <div
        className="border-3 border-neo-black rounded-neo shadow-hard overflow-hidden touch-none select-none"
        style={{ width, height }}
      >
        <ReactSketchCanvas
          ref={canvasRef}
          width={`${width}px`}
          height={`${height}px`}
          strokeWidth={brushSize}
          eraserWidth={brushSize * 3}
          strokeColor={activeColor}
          canvasColor="#0d0d1a"
          allowOnlyPointerType={readOnly ? 'none' : 'all'}
          style={{ border: 'none' }}
          onStroke={readOnly ? undefined : handleStrokeEnd}
          onChange={!readOnly && onStrokeUpdate ? handleOnChange : undefined}
        />
      </div>

      {/* Controls (hidden in read-only) */}
      {!readOnly && (
        <div className="flex flex-col items-center gap-2 w-full">
          {/* Color palette */}
          <div className="flex gap-1.5 flex-wrap justify-center">
            {COLORS.map((hex) => (
              <button
                key={hex}
                onClick={() => { setActiveColor(hex); setIsEraser(false); }}
                aria-label={hex}
                className={`
                  w-11 h-11 rounded-neo border-3 transition-all duration-100
                  ${activeColor === hex && !isEraser
                    ? 'border-neo-cream shadow-hard scale-110'
                    : 'border-neo-black shadow-hard-sm hover:scale-105'
                  }
                `}
                style={{ backgroundColor: hex }}
              />
            ))}
            {/* Eraser */}
            <button
              onClick={() => setIsEraser(!isEraser)}
              className={`
                w-11 h-11 rounded-neo border-3 transition-all duration-100
                flex items-center justify-center
                ${isEraser
                  ? 'border-neo-cream shadow-hard scale-110 bg-neo-navy-elevated'
                  : 'border-neo-black shadow-hard-sm hover:scale-105 bg-[#2d2d44]'
                }
              `}
              style={{
                backgroundImage: !isEraser ? 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.1) 3px, rgba(255,255,255,0.1) 6px)' : undefined,
              }}
            >
              <span className="text-neo-white text-xs font-bold">E</span>
            </button>
          </div>

          {/* Brush size */}
          <div className="flex gap-2 items-center">
            {BRUSH_SIZES.map((bSize) => (
              <button
                key={bSize}
                onClick={() => setBrushSize(bSize)}
                className={`
                  rounded-full transition-all duration-100
                  ${brushSize === bSize
                    ? 'ring-2 ring-neo-cream ring-offset-2 ring-offset-neo-navy'
                    : 'opacity-50 hover:opacity-80'
                  }
                `}
                style={{
                  width: Math.max(16, bSize + 10),
                  height: Math.max(16, bSize + 10),
                  backgroundColor: isEraser ? '#4a4a5e' : activeColor,
                }}
              />
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => canvasRef.current?.undo()}
              className="bg-neo-navy-elevated border-2 border-neo-cream/30 rounded-neo px-3 py-1.5 text-neo-white text-xs font-neo-body
                hover:border-neo-cream/50 active:translate-y-px transition-all"
            >
              {t('party.undo') || 'Undo'}
            </button>
            <button
              onClick={() => canvasRef.current?.redo()}
              className="bg-neo-navy-elevated border-2 border-neo-cream/30 rounded-neo px-3 py-1.5 text-neo-white text-xs font-neo-body
                hover:border-neo-cream/50 active:translate-y-px transition-all"
            >
              {t('party.redo') || 'Redo'}
            </button>
            <button
              onClick={() => canvasRef.current?.clearCanvas()}
              className="bg-neo-navy-elevated border-2 border-neo-red/30 rounded-neo px-3 py-1.5 text-neo-red/60 text-xs font-neo-body
                hover:border-neo-red/50 active:translate-y-px transition-all"
            >
              {t('party.clear') || 'Clear'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

DrawingCanvasInner.displayName = 'DrawingCanvas';
export const DrawingCanvas = memo(DrawingCanvasInner);

/**
 * Read-only drawing display for TV view.
 * Loads CanvasPath[] into a non-interactive ReactSketchCanvas.
 */
export const DrawingDisplay = memo(function DrawingDisplay({ paths, size = 300 }: { paths: DrawingData; size?: number }) {
  const canvasRef = useRef<ReactSketchCanvasRef>(null);

  useEffect(() => {
    if (paths && canvasRef.current) {
      canvasRef.current.resetCanvas();
      canvasRef.current.loadPaths(paths);
    }
  }, [paths]);

  return (
    <div
      className="border-3 border-neo-black rounded-neo shadow-hard overflow-hidden"
      style={{ width: size, height: size }}
    >
      <ReactSketchCanvas
        ref={canvasRef}
        width={`${size}px`}
        height={`${size}px`}
        canvasColor="#0d0d1a"
        allowOnlyPointerType="none"
        style={{ border: 'none', pointerEvents: 'none' }}
      />
    </div>
  );
});

DrawingDisplay.displayName = 'DrawingDisplay';

export { COLORS as DRAWING_COLORS };
