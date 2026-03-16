import { useCallback, useRef, useState, type RefObject } from 'react';
import { detectVerticalWords, detectHorizontalWords } from '../utils/blastVerticalScanner';
import {
  MAX_CASCADE_CHAIN,
  MAX_CASCADE_WORDS_PER_LEVEL,
  CASCADE_MIN_WORD_LENGTH,
  CASCADE_DETECTION_DELAY,
  CASCADE_CHAIN_BONUS_MULTIPLIER,
  CASCADE_HIGHLIGHT_DURATION,
  CASCADE_HIGHLIGHT_LINGER,
  type BlastGameState,
  type BlastTileState,
  type BlastTileType,
  type BlastExplosion,
  type BlastScorePopup,
  type CascadeHighlightPhase,
  type CascadeHighlightData,
} from '../types';
import type { LetterGrid } from '@/shared/types/game';
import type { useBlastCascade } from './useBlastCascade';

export interface CascadeHandlerDeps {
  isDictLoaded: boolean;
  checkWordInDict: (word: string) => boolean;
  cascade: ReturnType<typeof useBlastCascade>;
  gameStateRef: RefObject<BlastGameState>;
  tileStatesRef: RefObject<BlastTileState[][]>;
  onAutoCascadeWordRef: RefObject<((word: string, score: number, chainLevel: number) => void) | undefined>;
  setTileStates: (updater: BlastTileState[][] | ((prev: BlastTileState[][]) => BlastTileState[][])) => void;
  setCurrentGrid: (grid: LetterGrid) => void;
  setGameState: (updater: (prev: BlastGameState) => BlastGameState) => void;
  setExplosions: (updater: (prev: BlastExplosion[]) => BlastExplosion[]) => void;
  setScorePopups: (updater: (prev: BlastScorePopup[]) => BlastScorePopup[]) => void;
}

export interface CascadeHandlerReturn {
  handleCascadeComplete: (newGrid: LetterGrid, newTileStates: BlastTileState[][], affectedColumns: number[]) => void;
  handleCascadeCompleteRef: RefObject<(g: LetterGrid, ts: BlastTileState[][], cols: number[]) => void>;
  cascadeChainLevelRef: RefObject<number>;
  isAutoDetecting: boolean;
  autoDetectTimerRef: RefObject<ReturnType<typeof setTimeout> | null>;
  highlightTimerRef: RefObject<ReturnType<typeof setTimeout> | null>;
  cascadeHighlightPhase: CascadeHighlightPhase;
  cascadeHighlightData: CascadeHighlightData | null;
  setCascadeHighlightPhase: (phase: CascadeHighlightPhase) => void;
  setCascadeHighlightData: (data: CascadeHighlightData | null) => void;
  setIsAutoDetecting: (value: boolean) => void;
}

export function useBlastCascadeHandler(deps: CascadeHandlerDeps): CascadeHandlerReturn {
  const {
    isDictLoaded,
    checkWordInDict,
    cascade,
    gameStateRef,
    tileStatesRef,
    onAutoCascadeWordRef,
    setTileStates,
    setCurrentGrid,
    setGameState,
    setExplosions,
    setScorePopups,
  } = deps;

  const cascadeChainLevelRef = useRef(0);
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);
  const autoDetectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [cascadeHighlightPhase, setCascadeHighlightPhase] = useState<CascadeHighlightPhase>('idle');
  const [cascadeHighlightData, setCascadeHighlightData] = useState<CascadeHighlightData | null>(null);

  const handleCascadeCompleteRef = useRef<(g: LetterGrid, ts: BlastTileState[][], cols: number[]) => void>(() => {});

  const handleCascadeComplete = useCallback((newGrid: LetterGrid, newTileStates: BlastTileState[][], affectedColumns: number[]) => {
    setCurrentGrid(newGrid);
    setTileStates(newTileStates);

    if (
      cascadeChainLevelRef.current < MAX_CASCADE_CHAIN &&
      isDictLoaded &&
      !gameStateRef.current.isComplete &&
      !gameStateRef.current.isDeadEnd
    ) {
      setIsAutoDetecting(true);

      if (autoDetectTimerRef.current) clearTimeout(autoDetectTimerRef.current);

      autoDetectTimerRef.current = setTimeout(() => {
        const foundSet = new Set<string>();
        const columnFilter = affectedColumns.length > 0 ? new Set(affectedColumns) : undefined;
        const allVerticalWords = detectVerticalWords(newGrid, newTileStates, checkWordInDict, foundSet, CASCADE_MIN_WORD_LENGTH, columnFilter);
        // Horizontal: derive affected rows from affected columns (rows that received new/moved tiles)
        const rowFilter = affectedColumns.length > 0
          ? new Set(newTileStates.flatMap((row, ri) =>
              row.some((t, ci) => columnFilter!.has(ci) && !t.isCleared) ? [ri] : []
            ))
          : undefined;
        const allHorizontalWords = detectHorizontalWords(newGrid, newTileStates, checkWordInDict, foundSet, CASCADE_MIN_WORD_LENGTH, rowFilter);
        // Merge and deduplicate by position (vertical takes priority), cap total
        const usedCells = new Set<string>();
        for (const vw of allVerticalWords) {
          for (const cell of vw.path) usedCells.add(`${cell.row},${cell.col}`);
        }
        const nonOverlappingHorizontal = allHorizontalWords.filter(hw =>
          !hw.path.some(cell => usedCells.has(`${cell.row},${cell.col}`))
        );
        const allCascadeWords = [
          ...allVerticalWords.map(vw => ({ ...vw, column: vw.column })),
          ...nonOverlappingHorizontal.map(hw => ({ word: hw.word, column: hw.startCol, startRow: hw.row, endRow: hw.row, path: hw.path })),
        ];
        const verticalWords = allCascadeWords.slice(0, MAX_CASCADE_WORDS_PER_LEVEL);

        if (verticalWords.length > 0) {
          const chainLevel = cascadeChainLevelRef.current + 1;
          cascadeChainLevelRef.current = chainLevel;

          const highlightWords = verticalWords.map(vw => {
            const baseScore = vw.word.length - 1;
            const chainBonus = Math.floor(baseScore * chainLevel * CASCADE_CHAIN_BONUS_MULTIPLIER);
            return {
              word: vw.word,
              path: vw.path,
              score: baseScore + chainBonus,
              chainLevel,
            };
          });

          setCascadeHighlightData({ words: highlightWords });
          setCascadeHighlightPhase('highlighting');
          setIsAutoDetecting(false);

          if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
          highlightTimerRef.current = setTimeout(() => {
            const newExplosions: BlastExplosion[] = [];
            const newPopups: BlastScorePopup[] = [];
            const now = Date.now();
            let totalCascadeScore = 0;
            let newlyClearedCount = 0;
            const cascadeWords: string[] = [];
            const cascadeClearedTypes: Partial<Record<BlastTileType, number>> = {};

            // Structural sharing: only deep-copy rows containing cascade word cells.
            // Cascade words only affect cells in their known paths (no BFS/bomb side-effects).
            const cascadeAffectedRows = new Set<number>();
            for (const vw of verticalWords) {
              for (const cell of vw.path) cascadeAffectedRows.add(cell.row);
            }
            const nextTileStates = tileStatesRef.current!.map((row: BlastTileState[], ri: number) =>
              cascadeAffectedRows.has(ri) ? row.map((tile: BlastTileState) => ({ ...tile })) : row
            );

            for (const vw of verticalWords) {
              const baseScore = vw.word.length - 1;
              const chainBonus = Math.floor(baseScore * chainLevel * CASCADE_CHAIN_BONUS_MULTIPLIER);
              const wordScore = baseScore + chainBonus;
              totalCascadeScore += wordScore;
              cascadeWords.push(vw.word);

              for (const cell of vw.path) {
                const t = nextTileStates[cell.row][cell.col];
                if (!t.isCleared) {
                  if ((t.type === 'frozen' || t.type === 'ice' || t.type === 'prism' || t.type === 'gem') && t.hitsRemaining > 1) {
                    t.hitsRemaining--;
                    t.activationEffect = t.type === 'gem'
                      ? (t.hitsRemaining === 2 ? 'gem-shard-1' : 'gem-shard-2')
                      : `${t.type}-crack`;
                  } else {
                    t.isCleared = true;
                    newlyClearedCount++;
                    const tType = t.type as BlastTileType;
                    cascadeClearedTypes[tType] = (cascadeClearedTypes[tType] || 0) + 1;
                  }
                }
              }

              const midIdx = Math.floor(vw.path.length / 2);
              newExplosions.push({
                id: `cascade-${now}-${vw.column}-${vw.startRow}`,
                row: vw.path[midIdx].row,
                col: vw.path[midIdx].col,
                type: 'cascade',
                intensity: 1,
                timestamp: now,
              });

              // Collect popups instead of calling setScorePopups per word (batched below)
              newPopups.push({
                id: `cascade-score-${now}-${vw.column}-${vw.startRow}`,
                score: wordScore,
                row: vw.path[midIdx].row,
                col: vw.path[midIdx].col,
                isSpecial: true,
                timestamp: now,
              });

              onAutoCascadeWordRef.current?.(vw.word, wordScore, chainLevel);
            }

            // Batch all cascade score popups into a single state update
            if (newPopups.length > 0) {
              setScorePopups(prev => [...prev, ...newPopups]);
            }

            setGameState(prev => {
              const mergedTypeClears = { ...prev.tileTypeClears };
              for (const [tType, count] of Object.entries(cascadeClearedTypes)) {
                mergedTypeClears[tType as BlastTileType] = (mergedTypeClears[tType as BlastTileType] || 0) + (count as number);
              }
              return {
                ...prev,
                score: prev.score + totalCascadeScore,
                wordsFound: [...prev.wordsFound, ...cascadeWords],
                tilesCleared: prev.tilesCleared + newlyClearedCount,
                cascadeChainLevel: chainLevel,
                tileTypeClears: mergedTypeClears,
              };
            });

            setExplosions(prev => [...prev, ...newExplosions]);
            setTileStates(nextTileStates);

            setCascadeHighlightPhase('idle');
            setCascadeHighlightData(null);

            setTimeout(() => {
              cascade.startCascade(newGrid, nextTileStates, handleCascadeCompleteRef.current, 0, chainLevel);
            }, 80);
          }, CASCADE_HIGHLIGHT_DURATION + CASCADE_HIGHLIGHT_LINGER);
        } else {
          cascadeChainLevelRef.current = 0;
          setGameState(prev => ({ ...prev, cascadeChainLevel: 0 }));
          setIsAutoDetecting(false);
        }
      }, CASCADE_DETECTION_DELAY);
    } else {
      cascadeChainLevelRef.current = 0;
      setGameState(prev => ({ ...prev, cascadeChainLevel: 0 }));
    }
  }, [isDictLoaded, checkWordInDict, cascade, gameStateRef, tileStatesRef, onAutoCascadeWordRef, setTileStates, setCurrentGrid, setGameState, setExplosions, setScorePopups]);

  handleCascadeCompleteRef.current = handleCascadeComplete;

  return {
    handleCascadeComplete,
    handleCascadeCompleteRef,
    cascadeChainLevelRef,
    isAutoDetecting,
    autoDetectTimerRef,
    highlightTimerRef,
    cascadeHighlightPhase,
    cascadeHighlightData,
    setCascadeHighlightPhase,
    setCascadeHighlightData,
    setIsAutoDetecting,
  };
}
