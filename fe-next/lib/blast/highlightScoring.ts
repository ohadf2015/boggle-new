import type {
  HighlightEvent,
  WordSubmitEvent,
  RankedMoment,
  CaptionTag,
} from './highlightTypes';

export const EPICNESS_WEIGHTS = {
  wordScore: 1.0,
  comboMultiplier: 25,
  specialTileBonus: 40,
  cascadeDepth: 15,
  finalClearBonus: 9999,
} as const;

function isWord(e: HighlightEvent): e is WordSubmitEvent {
  return e.kind === 'word';
}

function epicness(e: WordSubmitEvent, isFinalClear: boolean): number {
  const uniqueSpecials = new Set(e.specialTilesHit).size;
  return (
    e.score * EPICNESS_WEIGHTS.wordScore +
    e.combo * EPICNESS_WEIGHTS.comboMultiplier +
    uniqueSpecials * EPICNESS_WEIGHTS.specialTileBonus +
    (isFinalClear ? EPICNESS_WEIGHTS.finalClearBonus : 0)
  );
}

function captionFor(
  e: WordSubmitEvent,
  isFinalClear: boolean,
  isTopByScore: boolean
): CaptionTag {
  if (isFinalClear) return 'finalClear';
  if (e.combo >= 3) return 'tripleCombo';
  if (new Set(e.specialTilesHit).size >= 2) return 'specialChain';
  if (isTopByScore) return 'biggestWord';
  return 'none';
}

export function rankMoments(events: HighlightEvent[]): RankedMoment[] {
  const words = events.filter(isWord);
  if (words.length === 0) return [];

  const endEvent = events.find(
    (e): e is Extract<HighlightEvent, { kind: 'end' }> => e.kind === 'end'
  );
  const lastWord = words[words.length - 1];
  const finalClearWord = endEvent?.reason === 'cleared' ? lastWord : null;

  const topByScore = [...words].sort((a, b) => b.score - a.score)[0];

  const moments: RankedMoment[] = words.map((w) => {
    const isFinal = w === finalClearWord;
    const isTop = w === topByScore;
    return {
      event: w,
      epicness: epicness(w, isFinal),
      caption: captionFor(w, isFinal, isTop),
      isFinalClear: isFinal,
    };
  });

  return moments.sort((a, b) => b.epicness - a.epicness);
}
