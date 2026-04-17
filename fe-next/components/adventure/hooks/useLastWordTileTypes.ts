/**
 * useLastWordTileTypes
 *
 * Snapshots the `type` of every tile that had an activationEffect at the
 * moment the most recent word landed. Used by flash-challenge detection so
 * challenge rules can react to which special tiles were actually consumed.
 */

import { useCallback, useEffect, useState } from 'react';
import { usePreviousValue } from '@/hooks/usePreviousValue';

interface TileLike { type: string; activationEffect?: unknown; }

interface UseLastWordTileTypesProps {
  wordsFoundLength: number;
  tiles: readonly TileLike[];
}

interface UseLastWordTileTypesResult {
  lastWordTileTypes: string[];
  resetLastWordTileTypes: () => void;
}

export function useLastWordTileTypes({ wordsFoundLength, tiles }: UseLastWordTileTypesProps): UseLastWordTileTypesResult {
  const [lastWordTileTypes, setLastWordTileTypes] = useState<string[]>([]);
  const prevWordsFoundLen = usePreviousValue(wordsFoundLength);
  useEffect(() => {
    if (prevWordsFoundLen !== undefined && wordsFoundLength > prevWordsFoundLen) {
      setLastWordTileTypes(tiles.filter(t => t.activationEffect).map(t => t.type));
    }
  }, [wordsFoundLength, prevWordsFoundLen, tiles]);
  const resetLastWordTileTypes = useCallback(() => setLastWordTileTypes([]), []);
  return { lastWordTileTypes, resetLastWordTileTypes };
}
