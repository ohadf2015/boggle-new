// ─── Blast Game Loop (Drag-to-Spell) ──────────────────────────────────
// Player drags across adjacent tiles to spell a word → validates → clears
// → gravity fills gaps → auto-cascade scans for bonus words → repeat

'use client';

import { useState, useCallback, useRef } from 'react';
import type { BlastTileState, BlastTileType } from '@/shared/types/blast';
import type { BlastGameConfig } from '@/components/blast/types';
import { generateTileStates, nextTileUid } from '@/components/blast/utils/blastTileGeneration';
import { generateSeededLetterGrid } from '@/components/blastEngine/utils/blastWordSeeder';
import type { Language } from '@/shared/types/game';

// ─── Types ────────────────────────────────────────────────────────────

interface ClearedTile { row: number; col: number; type: BlastTileType }
interface ScoreFlyData { score: number; row: number; col: number; tier: number }

interface GameLoopConfig {
  config: BlastGameConfig;
  wave: number;
  language: Language;
  movesAllowed?: number;
}

export interface GameLoopState {
  tileStates: BlastTileState[][];
  letterGrid: string[][];
  selectedTile: { row: number; col: number } | null;
  selectedPath: Array<{ row: number; col: number }>;
  currentWord: string;
  score: number;
  movesRemaining: number;
  movesUsed: number;
  comboLevel: number;
  cascadeLevel: number;
  wordsFound: string[];
  tilesCleared: number;
  totalTiles: number;
  lastClearedTiles: ClearedTile[] | undefined;
  lastScoreFly: ScoreFlyData | null;
  isWaveCleared: boolean;
  isProcessing: boolean;
  lastSwapPair: null;
  /** Called when drag enters a tile */
  selectTile: (row: number, col: number) => void;
  /** Called when drag ends — validates and clears word */
  submitWord: () => void;
  /** Reset game state for new wave */
  reset: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────

function isAdjacent(a: { row: number; col: number }, b: { row: number; col: number }): boolean {
  const dr = Math.abs(a.row - b.row);
  const dc = Math.abs(a.col - b.col);
  // Allow 8-directional adjacency (including diagonals) for richer word paths
  return dr <= 1 && dc <= 1 && (dr + dc > 0);
}

const dictionaryCache = new Map<string, boolean>();
/** In-flight requests to prevent duplicate concurrent calls for same word */
const pendingRequests = new Map<string, Promise<boolean>>();

async function isValidWord(word: string, lang: Language): Promise<boolean> {
  if (word.length < 3) return false;
  const key = `${lang}:${word.toLowerCase()}`;
  const cached = dictionaryCache.get(key);
  if (cached !== undefined) return cached;

  // Deduplicate in-flight requests for the same word
  const pending = pendingRequests.get(key);
  if (pending) return pending;

  const request = (async (): Promise<boolean> => {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch('/api/validate-word', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ word: word.toLowerCase(), language: lang }),
        });

        if (res.status === 429) {
          // Rate limited — wait and retry once
          if (attempt === 0) {
            await new Promise(r => setTimeout(r, 500));
            continue;
          }
          return false; // Still rate limited after retry
        }

        const data = await res.json();
        const isValid = Boolean(data.isValid);
        dictionaryCache.set(key, isValid);
        return isValid;
      } catch {
        return false;
      }
    }
    return false;
  })();

  pendingRequests.set(key, request);
  try {
    return await request;
  } finally {
    pendingRequests.delete(key);
  }
}

/** Expand special tile effects with chain reactions (max 3 depth to prevent infinite loops) */
function expandSpecialTiles(
  toClear: ClearedTile[], states: BlastTileState[][], size: number, clearSet: Set<string>,
): ClearedTile[] {
  const allBonus: ClearedTile[] = [];
  const add = (r: number, c: number) => {
    const k = `${r}-${c}`;
    if (r >= 0 && r < size && c >= 0 && c < size && !clearSet.has(k)) {
      clearSet.add(k);
      const tile = { row: r, col: c, type: states[r][c].type };
      allBonus.push(tile);
      return tile;
    }
    return null;
  };

  // Process queue with chain reactions (e.g. bomb clears a lightning → lightning fires)
  const queue = [...toClear];
  let depth = 0;
  const maxDepth = 3;

  while (queue.length > 0 && depth < maxDepth) {
    const batch = [...queue];
    queue.length = 0;
    depth++;

    for (const tile of batch) {
      const type = states[tile.row]?.[tile.col]?.type;
      const newTiles: ClearedTile[] = [];

      switch (type) {
        case 'bomb':
          for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
            const t = add(tile.row + dr, tile.col + dc);
            if (t) newTiles.push(t);
          }
          break;
        case 'lightning':
          for (let r = 0; r < size; r++) { const t = add(r, tile.col); if (t) newTiles.push(t); }
          break;
        case 'prism':
          for (let r = 0; r < size; r++) { const t = add(r, tile.col); if (t) newTiles.push(t); }
          for (let c = 0; c < size; c++) { const t = add(tile.row, c); if (t) newTiles.push(t); }
          break;
        case 'magnet':
          for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++)
            if (Math.abs(dr) + Math.abs(dc) <= 2) { const t = add(tile.row + dr, tile.col + dc); if (t) newTiles.push(t); }
          break;
        case 'rainbow':
          // Rainbow clears all tiles of the most common type on the board
          { const typeCounts = new Map<string, number>();
            for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
              if (!clearSet.has(`${r}-${c}`) && states[r][c].type === 'standard') {
                typeCounts.set(`${r}-${c}`, 1);
              }
            }
            // Clear up to 4 random standard tiles (rainbow wild card)
            let count = 0;
            for (const key of typeCounts.keys()) {
              if (count >= 4) break;
              const [rs, cs] = key.split('-').map(Number);
              const t2 = add(rs, cs);
              if (t2) { newTiles.push(t2); count++; }
            }
          }
          break;
      }

      // Chain: if newly cleared tiles are special, queue them for next depth
      for (const nt of newTiles) {
        const ntType = states[nt.row]?.[nt.col]?.type;
        if (ntType && ntType !== 'standard' && ntType !== 'gold' && ntType !== 'silver' && ntType !== 'diamond') {
          queue.push(nt);
        }
      }
    }
  }

  return allBonus;
}

function applyGravity(
  grid: string[][], tileStates: BlastTileState[][], size: number, _language: Language,
): { grid: string[][]; tileStates: BlastTileState[][] } {
  const newGrid = grid.map(r => [...r]);
  const newStates = tileStates.map(r => r.map(s => ({ ...s })));
  for (let col = 0; col < size; col++) {
    // Collect surviving tiles from bottom to top (preserving their uid + letter)
    const remaining: Array<{ letter: string; state: BlastTileState }> = [];
    for (let row = size - 1; row >= 0; row--) {
      if (!newStates[row][col].isCleared) remaining.push({ letter: newGrid[row][col], state: newStates[row][col] });
    }
    // Place surviving tiles from bottom up; empty top cells stay cleared (no refill)
    for (let row = size - 1; row >= 0; row--) {
      const item = remaining.shift();
      if (item) {
        newGrid[row][col] = item.letter;
        newStates[row][col] = { ...item.state, row, col, isCleared: false };
      } else {
        // Empty cell — stays cleared so the board progressively empties
        newGrid[row][col] = '';
        newStates[row][col] = { uid: nextTileUid(), row, col, type: 'standard', isCleared: true, activationEffect: null, hitsRemaining: 0 };
      }
    }
  }
  return { grid: newGrid, tileStates: newStates };
}

// ─── Hook ─────────────────────────────────────────────────────────────

export function useBlastGameLoop({ config, wave, language, movesAllowed }: GameLoopConfig): GameLoopState {
  const size = config.gridSize;
  const totalMoves = movesAllowed ?? (25 - Math.min(wave, 5) * 2);

  const [letterGrid, setLetterGrid] = useState<string[][]>(() => generateSeededLetterGrid(size, language, Date.now()));
  const [tileStates, setTileStates] = useState<BlastTileState[][]>(() =>
    generateTileStates(size, config.specialTileChance, Date.now(), config.customDistribution, wave),
  );
  const [score, setScore] = useState(0);
  const [movesRemaining, setMovesRemaining] = useState(totalMoves);
  const [movesUsed, setMovesUsed] = useState(0);
  const [comboLevel, setComboLevel] = useState(0);
  const [cascadeLevel, setCascadeLevel] = useState(0);
  const [wordsFound, setWordsFound] = useState<string[]>([]);
  const [tilesCleared, setTilesCleared] = useState(0);
  const [lastClearedTiles, setLastClearedTiles] = useState<ClearedTile[] | undefined>(undefined);
  const [lastScoreFly, setLastScoreFly] = useState<ScoreFlyData | null>(null);
  const [isWaveCleared, setIsWaveCleared] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Drag path (mutable ref for real-time updates during drag)
  const pathRef = useRef<Array<{ row: number; col: number }>>([]);
  const [selectedPath, setSelectedPath] = useState<Array<{ row: number; col: number }>>([]);
  const [currentWord, setCurrentWord] = useState('');

  const totalTiles = size * size;

  // ─── Clear a set of tiles + trigger special effects + gravity ──────

  const clearTilesAndCascade = useCallback(
    (word: string, path: Array<{ row: number; col: number }>, grid: string[][], states: BlastTileState[][]) => {
      const toClear: ClearedTile[] = [];
      const clearSet = new Set<string>();

      for (const cell of path) {
        const key = `${cell.row}-${cell.col}`;
        if (!clearSet.has(key)) {
          clearSet.add(key);
          toClear.push({ row: cell.row, col: cell.col, type: states[cell.row][cell.col].type });
        }
      }

      // Expand special tile effects
      toClear.push(...expandSpecialTiles(toClear, states, size, clearSet));

      // Score: base × length multiplier × special tile bonuses
      const lengthMultiplier = word.length <= 3 ? 1 : word.length <= 5 ? 1.5 : word.length <= 7 ? 2.5 : 4;
      let specialMultiplier = 1;
      for (const cell of path) {
        const type = states[cell.row]?.[cell.col]?.type;
        if (type === 'gold') specialMultiplier *= 2;
        else if (type === 'silver') specialMultiplier *= 1.5;
        else if (type === 'diamond') specialMultiplier *= 3;
      }
      // Bonus for each extra tile cleared by special effects
      const bonusTiles = toClear.length - path.length;
      const bonusScore = bonusTiles * 5;
      const wordScore = Math.round(word.length * 10 * lengthMultiplier * specialMultiplier + bonusScore);

      setScore(prev => prev + wordScore);
      setWordsFound(prev => [...prev, word]);
      setTilesCleared(prev => prev + toClear.length);
      setComboLevel(prev => prev + 1);

      // Score fly from path center
      const midCell = path[Math.floor(path.length / 2)];
      setLastScoreFly({ score: wordScore, row: midCell.row, col: midCell.col, tier: Math.min(word.length - 2, 5) });

      // Mark cleared
      const newStates = states.map(r => r.map(s => ({ ...s })));
      for (const tile of toClear) newStates[tile.row][tile.col].isCleared = true;
      setLastClearedTiles(toClear);
      setTileStates(newStates);

      // Gravity after clear animation (TileRenderer takes ~300ms for clearing)
      setTimeout(() => {
        const { grid: newGrid, tileStates: newStates2 } = applyGravity(grid, newStates, size, language);
        setLetterGrid(newGrid);
        setTileStates(newStates2);

        // Allow fall animation to play (~400ms) before checking wave completion
        setTimeout(() => {
          // Check wave completion
          setTilesCleared((prev: number) => {
            if (prev / totalTiles >= 0.5) setIsWaveCleared(true);
            return prev;
          });

          setIsProcessing(false);
          setComboLevel(0);
        }, 400);
      }, 350);
    },
    [size, language, totalTiles],
  );

  // ─── Drag: add tile to path (called during pointer move) ──────────

  const selectTile = useCallback(
    (row: number, col: number) => {
      if (isProcessing || movesRemaining <= 0) return;

      const path = pathRef.current;

      // Already in path? Check if it's the previous tile (backtrack)
      const existingIdx = path.findIndex(p => p.row === row && p.col === col);
      if (existingIdx >= 0) {
        if (existingIdx === path.length - 2) {
          // Backtrack: remove last tile
          path.pop();
          setSelectedPath([...path]);
          setCurrentWord(path.map(p => letterGrid[p.row]?.[p.col] ?? '').join(''));
        }
        return;
      }

      // Must be adjacent to last tile in path (or first tile)
      if (path.length > 0) {
        const last = path[path.length - 1];
        if (!isAdjacent(last, { row, col })) return;
      }

      // Tile must not be cleared
      if (tileStates[row]?.[col]?.isCleared) return;

      path.push({ row, col });
      setSelectedPath([...path]);
      setCurrentWord(path.map(p => letterGrid[p.row]?.[p.col] ?? '').join(''));
    },
    [isProcessing, movesRemaining, letterGrid, tileStates],
  );

  // ─── Submit word (called on pointer up) ────────────────────────────

  const submitWord = useCallback(async () => {
    const path = [...pathRef.current];
    pathRef.current = [];
    setSelectedPath([]);

    if (path.length < 3) {
      setCurrentWord('');
      return;
    }

    const word = path.map(p => letterGrid[p.row]?.[p.col] ?? '').join('');
    setCurrentWord('');

    // Check if already found this word
    if (wordsFound.includes(word.toLowerCase())) return;

    const valid = await isValidWord(word, language);
    if (!valid) {
      // TODO: shake animation for invalid word
      return;
    }

    setIsProcessing(true);
    setMovesRemaining(prev => prev - 1);
    setMovesUsed(prev => prev + 1);

    clearTilesAndCascade(word, path, letterGrid, tileStates);
  }, [letterGrid, language, wordsFound, tileStates, clearTilesAndCascade]);

  // ─── Reset ──────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    const newGrid = generateSeededLetterGrid(size, language, Date.now());
    const newStates = generateTileStates(size, config.specialTileChance, Date.now(), config.customDistribution, wave);
    setLetterGrid(newGrid);
    setTileStates(newStates);
    pathRef.current = [];
    setSelectedPath([]);
    setCurrentWord('');
    setScore(0);
    setMovesRemaining(totalMoves);
    setMovesUsed(0);
    setComboLevel(0);
    setCascadeLevel(0);
    setWordsFound([]);
    setTilesCleared(0);
    setLastClearedTiles(undefined);
    setLastScoreFly(null);
    setIsWaveCleared(false);
    setIsProcessing(false);
  }, [size, language, config, wave, totalMoves]);

  return {
    tileStates, letterGrid,
    selectedTile: selectedPath.length > 0 ? selectedPath[selectedPath.length - 1] : null,
    selectedPath, currentWord, score, movesRemaining, movesUsed,
    comboLevel, cascadeLevel, wordsFound, tilesCleared, totalTiles,
    lastClearedTiles, lastScoreFly, isWaveCleared, isProcessing,
    lastSwapPair: null,
    selectTile, submitWord, reset,
  };
}
