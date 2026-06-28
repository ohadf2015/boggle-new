'use client';

import { useRef, useState, useEffect, useCallback, useMemo, memo } from 'react';
import GridComponent from '@/components/GridComponent';
import { BlastTile } from './BlastTile';
import { BlastDragTrail } from './BlastDragTrail';
import type { SelectedCell } from '@/components/grid';
import type { LetterGrid, Language } from '@/shared/types/game';
import type { BlastTileState, BlastTileType } from './types';
import type { SequencerState, TileAnimState } from './hooks/useBlastSequencer';
import { GRID_PADDING, GRID_PADDING_PX, GRID_GAP_CLASS } from '@/components/grid/gridLayoutConstants';
import { DESKTOP_IDLE_AUTOSUBMIT_MS } from '@/components/grid/submitHintVisibility';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEquippedCosmetic } from '@/hooks/useEquippedCosmetic';
import { COMBO_ELIGIBLE_TILES } from './utils/blastCombos';
import { computeCellFilter, createPortalAdjacency } from './hooks/blastCellFilterLogic';
import { scanOffensiveSpecial, OFFENSIVE_RANK } from './utils/blastTileEffects';
import { getTileTooltip } from './utils/blastTileTooltips';

const ZONE_PREVIEW_TILES: Partial<Record<BlastTileType, 'bomb' | 'lightning' | 'prism' | 'magnet'>> = {
  bomb: 'bomb',
  lightning: 'lightning',
  prism: 'prism',
  magnet: 'magnet',
};

function getZonePreview(type: BlastTileType): 'bomb' | 'lightning' | 'prism' | 'magnet' | null {
  return ZONE_PREVIEW_TILES[type] ?? null;
}

/** Find which tile rainbow will copy in the current selection */
function computeScanTarget(
  cells: SelectedCell[],
  tiles: BlastTileState[][],
): { key: string; source: 'rainbow' } | null {
  if (cells.length < 2) return null;
  const hasRainbow = cells.some(c => tiles[c.row]?.[c.col]?.type === 'rainbow');
  if (!hasRainbow) return null;

  const path = cells.map(c => ({ row: c.row, col: c.col }));

  if (scanOffensiveSpecial(path, tiles, 'best')) {
    let bestRank = -1;
    let bestKey: string | null = null;
    for (const c of cells) {
      const t = tiles[c.row]?.[c.col];
      if (t && !t.isCleared && t.type !== 'rainbow') {
        const rank = OFFENSIVE_RANK[t.type] ?? -1;
        if (rank > bestRank) { bestRank = rank; bestKey = `${c.row}-${c.col}`; }
      }
    }
    if (bestKey) return { key: bestKey, source: 'rainbow' };
  }

  return null;
}

export interface BlastBoardProps {
  grid: LetterGrid;
  tileStates: BlastTileState[][];
  gridSize: number;
  language: Language;
  interactive: boolean;
  onWordSubmit: (word: string) => void;
  onPathSubmit: (cells: Array<{ row: number; col: number }>) => void;
  onWordChange: (word: string, count: number) => void;
  sequencerState?: SequencerState;
  nearMissCells?: Array<{ row: number; col: number }>;
  /** Cells highlighted during cascade discovery — glow before clearing */
  cascadeHighlightCells?: Array<{ row: number; col: number }>;
  /** Remaining turns of diamond reveal (shows frozen tile inner types) */
  diamondRevealTurns?: number;
  /**
   * Multiplayer round — suppress the per-tile explanation tooltips (the mobile
   * info pop-up + the native `title` hint). In a timed competitive MP game the
   * descriptions are distracting clutter; single-player keeps them as a learning
   * aid.
   */
  isMultiplayer?: boolean;
}

/**
 * BlastBoard - Game grid wrapping GridComponent with blast-specific tile overlays.
 *
 * Layers (bottom to top):
 * 1. GridComponent — proven word input with touch/drag interaction
 * 2. BlastTile overlay grid — special tile backgrounds, indicators, selection glow
 */
export const BlastBoard = memo(function BlastBoard({
  grid,
  tileStates,
  gridSize,
  language,
  interactive,
  onWordSubmit,
  onPathSubmit,
  onWordChange,
  sequencerState,
  nearMissCells = [],
  cascadeHighlightCells = [],
  diamondRevealTurns = 0,
  isMultiplayer = false,
}: BlastBoardProps) {
  const { t } = useLanguage();
  const equippedBoardTheme = useEquippedCosmetic('boardTheme');
  const equippedTileSkin = useEquippedCosmetic('tileSkin');
  const gridStyle = useMemo(() => ({
    padding: GRID_PADDING,
    gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
    gridTemplateRows: `repeat(${gridSize}, minmax(0, 1fr))`,
  }), [gridSize]);
  const containerRef = useRef<HTMLDivElement>(null);
  // Initialize to 1 (not 0) so the overlay grid renders immediately.
  // Fall animation pixel math degrades gracefully until ResizeObserver fires.
  const [containerWidth, setContainerWidth] = useState(1);

  // Measure container for overlay alignment
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    observer.observe(el);
    setContainerWidth(el.getBoundingClientRect().width);

    return () => observer.disconnect();
  }, []);

  // Track selected cells for overlay selection glow
  const [selectedCells, setSelectedCells] = useState<SelectedCell[]>([]);
  const handleSelectionChange = useCallback((cells: SelectedCell[]) => {
    setSelectedCells(cells);
  }, []);

  // Cell filter: gates selectability based on tile type (ice, gem, etc.)
  const cellFilter = useMemo(
    () => computeCellFilter(tileStates, selectedCells),
    [tileStates, selectedCells],
  );

  // Portal-aware adjacency: lets word paths teleport through paired portal tiles
  const portalAdjacency = useMemo(
    () => createPortalAdjacency(tileStates),
    [tileStates],
  );

  const selectedPositions = useMemo(
    () => new Set(selectedCells.map((c) => `${c.row}-${c.col}`)),
    [selectedCells],
  );

  // Selection index map — position of each cell in the word path
  const selectionIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = 0; i < selectedCells.length; i++) {
      map.set(`${selectedCells[i].row}-${selectedCells[i].col}`, i);
    }
    return map;
  }, [selectedCells]);

  const nearMissSet = useMemo(
    () => new Set(nearMissCells.map(c => `${c.row}-${c.col}`)),
    [nearMissCells],
  );

  const cascadeHighlightSet = useMemo(
    () => new Set(cascadeHighlightCells.map(c => `${c.row}-${c.col}`)),
    [cascadeHighlightCells],
  );

  // Combo preview: detect if 2+ combo-eligible tiles are in the current selection
  const comboPreviewSet = useMemo(() => {
    if (selectedCells.length < 2) return null;
    const eligibleKeys: string[] = [];
    for (const cell of selectedCells) {
      const tile = tileStates[cell.row]?.[cell.col];
      if (tile && !tile.isCleared && COMBO_ELIGIBLE_TILES.has(tile.type)) {
        eligibleKeys.push(`${cell.row}-${cell.col}`);
      }
    }
    return eligibleKeys.length >= 2 ? new Set(eligibleKeys) : null;
  }, [selectedCells, tileStates]);

  // Portal pair index map — assign each unique portalPairId a color index
  const portalPairMap = useMemo(() => {
    const map = new Map<string, number>();
    let idx = 0;
    for (const row of tileStates) {
      for (const tile of row) {
        if (tile.type === 'portal' && tile.portalPairId && !tile.isCleared && !map.has(tile.portalPairId)) {
          map.set(tile.portalPairId, idx++);
        }
      }
    }
    return map;
  }, [tileStates]);

  // Rainbow/Mirror scan target — find which tile in the selection will be copied
  const scanTargetKey = useMemo(
    () => computeScanTarget(selectedCells, tileStates),
    [selectedCells, tileStates],
  );

  // Build a lookup map from sequencer active tiles
  const animLookup = useMemo(() => {
    if (!sequencerState?.activeTiles.length) return null;
    const map = new Map<string, TileAnimState>();
    for (const t of sequencerState.activeTiles) {
      map.set(`${t.row}-${t.col}`, t);
    }
    return map;
  }, [sequencerState]);

  // Single-tile tooltip: when exactly 1 special tile is selected, show its info.
  // Suppressed in multiplayer — the explanations are distracting clutter during a
  // timed, competitive round.
  const singleTileTooltip = useMemo(() => {
    if (isMultiplayer) return null;
    if (selectedCells.length !== 1) return null;
    const c = selectedCells[0];
    const tile = tileStates[c.row]?.[c.col];
    if (!tile || tile.type === 'standard') return null;
    const tooltip = getTileTooltip(tile.type, t);
    if (!tooltip) return null;
    return { ...tooltip, row: c.row, col: c.col };
  }, [isMultiplayer, selectedCells, tileStates, t]);

  // Only render overlay once we have tile states
  const hasTileStates = tileStates.length > 0 && tileStates[0]?.length > 0;

  return (
    <div
      ref={containerRef}
      className={`blast-board relative w-full aspect-square overflow-hidden${equippedBoardTheme ? ` cosmetic-board-${equippedBoardTheme.replace('board-', '')}` : ''}`}
      {...(equippedTileSkin && { 'data-tile-skin': equippedTileSkin.replace('tile-', '') })}
      style={{ contain: 'layout paint' }}
    >
      {/* Layer 1: GridComponent — word selection via touch/drag */}
      <GridComponent
        grid={grid}
        interactive={interactive}
        onWordSubmit={onWordSubmit}
        onPathSubmit={onPathSubmit}
        onWordChange={onWordChange}
        onSelectionChange={handleSelectionChange}
        cellFilter={cellFilter}
        isAdjacent={portalAdjacency}
        autoSubmitIdleMs={DESKTOP_IDLE_AUTOSUBMIT_MS}
        hideWordPreview
        hideComboIndicator
        largeText
        language={language}
        ghostCells
      />

      {/* Layer 1.5: Drag trail — SVG polyline through selected tile centers */}
      {selectedCells.length >= 2 && containerWidth > 0 && (
        <BlastDragTrail
          selectedCells={selectedCells}
          gridSize={gridSize}
          containerWidth={containerWidth}
          padding={GRID_PADDING_PX}
        />
      )}

      {/* Layer 2: Blast tile type overlay — indicators, special backgrounds, selection glow */}
      {hasTileStates && containerWidth > 0 && (
        <div
          dir="ltr"
          className={`absolute inset-0 pointer-events-none z-[10] grid ${GRID_GAP_CLASS}`}
          style={gridStyle}
          aria-hidden="true"
        >
          {tileStates.flat().map((tile) => {
            const key = `${tile.row}-${tile.col}`;
            const isSelected = selectedPositions.has(key);
            const animState = animLookup?.get(key);
            // Map sequencer AnimPhase to BlastTile TilePhase (chain_pause maps to idle)
            const rawPhase = animState?.phase;
            const tilePhase = rawPhase && rawPhase !== 'chain_pause' ? rawPhase : (isSelected ? 'selected' : 'idle');

            // Empty/cleared cell — invisible placeholder to keep grid alignment
            if (tile.isCleared && !animState) {
              return (
                <div
                  key={key}
                  role="gridcell"
                  aria-hidden="true"
                  className="aspect-square rounded-neo"
                  style={{ visibility: 'hidden' }}
                />
              );
            }

            // Always render BlastTile for non-cleared tiles so standard tiles stay visible

            const letter = grid[tile.row]?.[tile.col] ?? '';
            const cellHeight = containerWidth / gridSize;

            return (
              <BlastTile
                key={key}
                letter={letter}
                type={tile.type}
                phase={tilePhase}
                isSelected={isSelected}
                isCleared={tile.isCleared}
                hitsRemaining={tile.hitsRemaining}
                countdown={tile.countdown}
                fuseTimer={tile.fuseTimer}
                isNearMiss={nearMissSet.has(key)}
                activationEffect={tile.activationEffect}
                isComboPreview={comboPreviewSet?.has(key) ?? false}
                selectionIndex={selectionIndexMap.get(key)}
                selectionTotal={selectedCells.length}
                isLocked={!cellFilter(tile.row, tile.col) && !tile.isCleared}
                isCascadeHighlight={cascadeHighlightSet.has(key)}
                zonePreview={isSelected ? getZonePreview(tile.type) : null}
                isDiamondRevealed={tile.type === 'frozen' && diamondRevealTurns > 0 && tile.innerType != null}
                innerType={tile.innerType}
                portalPairIndex={tile.type === 'portal' && tile.portalPairId ? portalPairMap.get(tile.portalPairId) : undefined}
                isScanTarget={scanTargetKey?.key === key ? scanTargetKey.source : undefined}
                hideTooltip={isMultiplayer}
                clearRotate={animState?.clearRotate}
                col={tile.col}
                fallOffset={animState?.fallDistance ? animState.fallDistance * cellHeight : undefined}
                spawnOffset={animState?.spawnOffset ? animState.spawnOffset * cellHeight : undefined}
              />
            );
          })}
        </div>
      )}
      {/* Layer 3: Single-tile info tooltip (mobile-friendly) */}
      {singleTileTooltip && (
        <div
          className="absolute left-1/2 -translate-x-1/2 z-30 px-3 py-1.5 rounded-neo bg-neo-navy/95 border border-neo-lime/40 shadow-hard-sm pointer-events-none animate-neo-pop"
          style={{
            top: `${(singleTileTooltip.row / gridSize) * 100}%`,
            transform: `translateX(-50%) translateY(${singleTileTooltip.row < 2 ? '110%' : '-110%'})`,
            maxWidth: '85%',
          }}
        >
          <span className="text-[0.7rem] font-neo-display text-neo-lime whitespace-nowrap">
            {singleTileTooltip.icon} {singleTileTooltip.name}
          </span>
          <span className="block text-[0.6rem] font-neo-body text-neo-white leading-tight">
            {singleTileTooltip.desc}
          </span>
        </div>
      )}
    </div>
  );
});

export default BlastBoard;
