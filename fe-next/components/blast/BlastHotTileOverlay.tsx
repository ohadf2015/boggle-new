'use client';

import { HOT_TILE_DURATION_MS, type HotTile } from './hooks/useBlastHotTiles';
import { useEffect, useRef, useState } from 'react';

interface BlastHotTileOverlayProps {
  hotTiles: HotTile[];
  cellSize: number;
  /** Current timestamp for expiry calculations. Pass from parent to keep render pure. */
  now?: number;
  onExpired?: (row: number, col: number) => void;
}

const GOLD = '#FFD700';
/** Tiles expiring within this window get urgent styling */
const EXPIRING_THRESHOLD_MS = 2000;

/**
 * BlastHotTileOverlay — Golden pulsing overlays for hot tiles.
 * Positioned absolutely over the grid; each tile uses top/left based on cellSize.
 * Uses CSS @keyframes instead of framer-motion for zero-JS animation overhead.
 */
export function BlastHotTileOverlay({
  hotTiles,
  cellSize,
  now = 0,
  onExpired,
}: BlastHotTileOverlayProps) {
  /** Track tiles that are exiting so we can animate them out */
  const [exitingTiles, setExitingTiles] = useState<Map<string, HotTile>>(new Map());
  const prevTileKeys = useRef<Set<string>>(new Set());

  // Detect removed tiles and move them to exiting state
  useEffect(() => {
    const currentKeys = new Set(hotTiles.map(t => `hot-${t.row}-${t.col}`));
    const removed = new Map<string, HotTile>();

    prevTileKeys.current.forEach(key => {
      if (!currentKeys.has(key)) {
        // Find the tile data from the previous render — we stored it
        // We don't have old tile data here, so we parse row/col from key
        const [, row, col] = key.split('-').map(Number);
        removed.set(key, { row, col, expiresAt: 0 } as HotTile);
      }
    });

    if (removed.size > 0) {
      setExitingTiles(prev => {
        const next = new Map(prev);
        removed.forEach((tile, key) => next.set(key, tile));
        return next;
      });

      // Remove after exit animation completes
      const timer = setTimeout(() => {
        setExitingTiles(prev => {
          const next = new Map(prev);
          removed.forEach((_, key) => next.delete(key));
          return next;
        });
      }, 300);

      return () => clearTimeout(timer);
    }

    prevTileKeys.current = currentKeys;
    return undefined;
  }, [hotTiles]);

  if (hotTiles.length === 0 && exitingTiles.size === 0) return null;

  return (
    <>
      <style>{`
        @keyframes hot-tile-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.06); }
        }
        @keyframes hot-tile-pulse-urgent {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.06); }
        }
        @keyframes hot-tile-enter {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes hot-tile-exit {
          0% { opacity: 1; transform: rotate(0deg); }
          14% { transform: rotate(3deg); }
          28% { transform: rotate(-3deg); }
          42% { transform: rotate(3deg); }
          56% { transform: rotate(-3deg); }
          70% { transform: rotate(3deg); }
          84% { transform: rotate(-3deg); }
          100% { opacity: 0; transform: rotate(0deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .hot-tile-active {
            animation: hot-tile-enter 0.2s ease-out forwards !important;
          }
          .hot-tile-exiting {
            animation: none !important;
            opacity: 0;
          }
        }
      `}</style>
      <div
        className="absolute inset-0 pointer-events-none z-[12]"
        data-testid="blast-hot-tile-container"
      >
        {hotTiles.map(tile => {
          const key = `hot-${tile.row}-${tile.col}`;
          const timeLeft = now > 0 ? tile.expiresAt - now : HOT_TILE_DURATION_MS;
          const isExpiring = timeLeft < EXPIRING_THRESHOLD_MS && timeLeft > 0;

          return (
            <div
              key={key}
              data-testid="hot-tile-overlay"
              className="absolute rounded-lg hot-tile-active"
              style={{
                top: tile.row * cellSize,
                left: tile.col * cellSize,
                width: cellSize,
                height: cellSize,
                border: `2px solid ${GOLD}`,
                boxShadow: `0 0 12px ${GOLD}80, inset 0 0 8px ${GOLD}40${isExpiring ? `, 0 0 6px rgba(255,0,0,0.4)` : ''}`,
                background: isExpiring
                  ? 'rgba(255, 60, 60, 0.12)'
                  : 'rgba(255, 215, 0, 0.1)',
                animation: `hot-tile-enter 0.2s ease-out forwards, ${isExpiring ? 'hot-tile-pulse-urgent 0.4s' : 'hot-tile-pulse 0.8s'} ease-in-out infinite`,
              }}
            >
              {/* 3x badge */}
              <span
                data-testid="hot-tile-badge"
                className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-[9px] font-black px-1 py-px rounded-bl-md rounded-tr-lg leading-none"
              >
                3x
              </span>
            </div>
          );
        })}
        {Array.from(exitingTiles.entries()).map(([key, tile]) => (
          <div
            key={`exit-${key}`}
            className="absolute rounded-lg hot-tile-exiting"
            style={{
              top: tile.row * cellSize,
              left: tile.col * cellSize,
              width: cellSize,
              height: cellSize,
              border: `2px solid ${GOLD}`,
              boxShadow: `0 0 12px ${GOLD}80, inset 0 0 8px ${GOLD}40`,
              background: 'rgba(255, 215, 0, 0.1)',
              animation: 'hot-tile-exit 0.3s ease-out forwards',
            }}
          />
        ))}
      </div>
    </>
  );
}
