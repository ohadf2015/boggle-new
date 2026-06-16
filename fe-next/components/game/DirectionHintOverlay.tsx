'use client';

import { useState, useEffect, useCallback, memo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { NeoPanel } from '@/components/ui/panel';

const AUTO_DISMISS_MS = 4000;
const STORAGE_KEY = 'hasSeenDirectionHint';

// Zigzag path: (0,0) → (1,1) → (0,2) → (1,2)
const ZIGZAG_PATH: [number, number][] = [
  [0, 0],
  [1, 1],
  [0, 2],
  [1, 2],
];

interface DirectionHintOverlayProps {
  t: (key: string, params?: Record<string, string | number>) => string;
}

const DirectionHintOverlay = memo<DirectionHintOverlayProps>(function DirectionHintOverlay({ t }) {
  const [visible, setVisible] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch {
      return;
    }
    setVisible(true);
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // Storage unavailable
    }
  }, []);

  // Animate zigzag path cells sequentially
  useEffect(() => {
    if (!visible) return;
    if (activeStep >= ZIGZAG_PATH.length) return;

    const timer = setTimeout(() => {
      setActiveStep((s) => s + 1);
    }, 400);
    return () => clearTimeout(timer);
  }, [visible, activeStep]);

  // Auto-dismiss after 4 seconds
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => dismiss(), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [visible, dismiss]);

  const cellSize = 32;
  const gap = 4;
  const getCenter = (row: number, col: number) => ({
    x: col * (cellSize + gap) + cellSize / 2,
    y: row * (cellSize + gap) + cellSize / 2,
  });

  const isCellActive = (row: number, col: number) =>
    ZIGZAG_PATH.slice(0, activeStep).some(([r, c]) => r === row && c === col);

  return (
    <AnimatePresence>
      {visible && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={dismiss}
          data-testid="direction-hint-overlay"
        >
          <NeoPanel asChild tone="navy" shadow="lg" className="p-5 max-w-[280px] flex flex-col items-center gap-3">
          <m.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mini 3x3 grid with zigzag path */}
            <div className="relative" dir="ltr">
              <div
                className="grid grid-cols-3"
                style={{ gap: `${gap}px` }}
              >
                {Array.from({ length: 3 }, (_, row) =>
                  Array.from({ length: 3 }, (_, col) => {
                    const active = isCellActive(row, col);
                    return (
                      <m.div
                        key={`${row}-${col}`}
                        className={`flex items-center justify-center rounded border-2 ${
                          active
                            ? 'bg-neo-lime border-neo-black'
                            : 'border-neo-cream/30 bg-neo-navy'
                        }`}
                        style={{ width: cellSize, height: cellSize }}
                        animate={active ? { scale: [1, 1.15, 1] } : {}}
                        transition={{ duration: 0.3 }}
                      />
                    );
                  })
                )}
              </div>

              {/* SVG path lines connecting active cells */}
              {activeStep > 1 && (
                <svg
                  className="absolute inset-0 pointer-events-none"
                  width={3 * cellSize + 2 * gap}
                  height={3 * cellSize + 2 * gap}
                >
                  {ZIGZAG_PATH.slice(0, activeStep).map((cell, i) => {
                    if (i === 0) return null;
                    const prev = ZIGZAG_PATH[i - 1];
                    const from = getCenter(prev[0], prev[1]);
                    const to = getCenter(cell[0], cell[1]);
                    return (
                      <m.line
                        key={`${cell[0]}-${cell[1]}`}
                        x1={from.x}
                        y1={from.y}
                        x2={to.x}
                        y2={to.y}
                        stroke="#FFE135"
                        strokeWidth="3"
                        strokeLinecap="round"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 0.2 }}
                      />
                    );
                  })}
                </svg>
              )}
            </div>

            {/* Text */}
            <p className="text-neo-white font-black uppercase text-center text-sm leading-snug">
              {t('tutorial.multiDirection')}
            </p>

            {/* Progress bar */}
            <m.div
              className="w-full h-1 bg-neo-yellow/40 rounded-full overflow-hidden"
            >
              <m.div
                className="h-full bg-neo-yellow rounded-full"
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: AUTO_DISMISS_MS / 1000, ease: 'linear' }}
              />
            </m.div>
          </m.div>
          </NeoPanel>
        </m.div>
      )}
    </AnimatePresence>
  );
});

DirectionHintOverlay.displayName = 'DirectionHintOverlay';

export default DirectionHintOverlay;
