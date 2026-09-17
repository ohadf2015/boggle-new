/**
 * Face-down / cleared / missed tile grid for Team Tiles Unplugged.
 *
 * Projector-first: big neo tiles, cream edge on navy, no student-device chrome.
 */
'use client';

import { Check, HelpCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TeamTile } from '@/lib/education/teamTilesUnpluggedGame';

const TILE_TONES = [
  'bg-neo-pink text-neo-black',
  'bg-neo-cyan text-neo-black',
  'bg-neo-lime text-neo-black',
  'bg-neo-yellow text-neo-black',
] as const;

export interface TeamTilesBoardProps {
  tiles: readonly TeamTile[];
  activeTileId: number | null;
  disabled?: boolean;
  reducedMotion?: boolean;
  onFlip: (tileId: number) => void;
  faceDownLabel: string;
}

export function TeamTilesBoard({
  tiles,
  activeTileId,
  disabled = false,
  reducedMotion = false,
  onFlip,
  faceDownLabel,
}: TeamTilesBoardProps) {
  const count = tiles.length;
  const cols =
    count <= 4 ? 2 : count <= 9 ? 3 : count <= 12 ? 4 : 4;

  return (
    <div
      data-testid="team-tiles-board"
      data-cols={cols}
      className={cn(
        'grid gap-2 sm:gap-3 w-full max-w-4xl mx-auto flex-1 min-h-0 content-center',
        cols === 2 && 'grid-cols-2',
        cols === 3 && 'grid-cols-3',
        cols === 4 && 'grid-cols-4',
      )}
    >
      {tiles.map((tile, i) => {
        const tone = TILE_TONES[i % TILE_TONES.length]!;
        const isActive = tile.id === activeTileId;
        const isDown = tile.face === 'down';
        const isCleared = tile.face === 'cleared';
        const isMissed = tile.face === 'missed';
        const clickable = isDown && !disabled && activeTileId === null;

        return (
          <button
            key={tile.id}
            type="button"
            data-testid={`team-tile-${tile.id}`}
            data-face={tile.face}
            data-active={String(isActive)}
            disabled={!clickable}
            aria-label={
              isDown
                ? faceDownLabel
                : tile.word
            }
            onClick={() => {
              if (clickable) onFlip(tile.id);
            }}
            className={cn(
              'aspect-square min-h-0 rounded-neo border-[3px] border-neo-black shadow-hard',
              'flex flex-col items-center justify-center gap-1 p-1 sm:p-2',
              'font-neo-display font-bold uppercase',
              'disabled:cursor-default',
              clickable &&
                'hover:-translate-y-0.5 hover:shadow-hard-lg active:shadow-hard-pressed active:translate-y-[1px]',
              !reducedMotion && clickable && 'transition-all',
              isDown && tone,
              isActive && 'bg-neo-cream text-neo-black ring-4 ring-neo-lime',
              isCleared && 'bg-neo-lime/80 text-neo-black opacity-90',
              isMissed && 'border-neo-cream/40 bg-neo-navy-elevated text-neo-cream/70 opacity-80',
              tile.face === 'up' && !isActive && 'bg-neo-cream text-neo-black',
            )}
          >
            {isDown ? (
              <>
                <HelpCircle className="w-[clamp(1.25rem,4vw,2.5rem)] h-[clamp(1.25rem,4vw,2.5rem)]" aria-hidden />
                <span className="text-[clamp(0.9rem,2.5vw,1.75rem)] tabular-nums">
                  {i + 1}
                </span>
              </>
            ) : isCleared ? (
              <>
                <Check className="w-6 h-6 sm:w-8 sm:h-8" aria-hidden />
                <span className="text-[clamp(0.55rem,1.4vw,1rem)] leading-tight text-center break-words max-w-full px-0.5">
                  {tile.word}
                </span>
              </>
            ) : isMissed ? (
              <>
                <X className="w-6 h-6 sm:w-8 sm:h-8" aria-hidden />
                <span className="text-[clamp(0.55rem,1.4vw,1rem)] leading-tight text-center break-words max-w-full px-0.5 line-through">
                  {tile.word}
                </span>
              </>
            ) : (
              <span className="text-[clamp(0.7rem,2vw,1.4rem)] leading-tight text-center break-words max-w-full px-0.5">
                {tile.word}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
