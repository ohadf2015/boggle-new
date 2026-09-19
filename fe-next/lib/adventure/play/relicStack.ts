/**
 * Live, STACKED relic numbers (Balatro's "Currently +104"): what a relic is
 * worth given the words this run actually found AND the relics it already owns.
 * Everything replays through scoreWords/applyRelics — the formula the server
 * credits — so the number on a card or tooltip is never a guess.
 */
import { RELICS, isRelicId, secondsBonus, type RelicId } from './relics';
import { scoreWords } from './scoreRun';
import type { LevelKind } from './levels';

export interface LevelWords {
  words: readonly string[];
  kind?: LevelKind;
  /** Level length in seconds (hourglass pace). Defaults to 90. */
  seconds?: number;
}

export interface RelicStack {
  /** Points per level if this were the only relic. */
  alone: number;
  /** Points per level on top of everything else the run owns. */
  combined: number;
  /** combined beats alone because of relics already owned. */
  synergy: boolean;
  /** Words this run the relic would have changed. */
  hits: number;
}

const DEFAULT_SECONDS = 90;

const isScoring = (id: RelicId) => RELICS[id].effect.type !== 'stat';
const known = (relics: readonly string[]) => [...new Set(relics)].filter(isRelicId);

/**
 * Leave-one-out share of each owned SCORING relic this level:
 * score(all owned) − score(all owned but this one). Stat relics are omitted.
 */
export function relicContributions(words: readonly string[], relics: readonly RelicId[], kind?: LevelKind): Partial<Record<RelicId, number>> {
  const owned = known(relics);
  const full = scoreWords(words, { relics: owned, kind }).score;
  const out: Partial<Record<RelicId, number>> = {};
  for (const id of owned) {
    if (!isScoring(id)) continue;
    out[id] = full - scoreWords(words, { relics: owned.filter((r) => r !== id), kind }).score;
  }
  return out;
}

const total = (levels: readonly LevelWords[], relics: readonly RelicId[]) =>
  levels.reduce((s, l) => s + scoreWords(l.words, { relics, kind: l.kind }).score, 0);

function hitCount(levels: readonly LevelWords[], id: RelicId) {
  const e = RELICS[id].effect;
  let hits = 0;
  for (const l of levels) {
    l.words.forEach((w, index) => {
      const ctx = { len: Array.from(w).length, index };
      if ((e.type === 'flat' && e.bonus(ctx) > 0) || (e.type === 'mult' && e.factor(ctx) !== 1)) hits++;
    });
  }
  return hits;
}

/**
 * Per-level value of `id` alone vs stacked with `owned` (the relic itself is
 * ignored in `owned`, so a tooltip for an owned relic equals its draft card).
 * Hourglass is priced as its extra seconds at the run's own pace.
 * Null when there is nothing to replay or the relic does not score.
 */
export function relicStack(id: RelicId, { levels, owned }: { levels: readonly LevelWords[]; owned: readonly RelicId[] }): RelicStack | null {
  const played = levels.filter((l) => l.words.length > 0);
  if (played.length === 0) return null;
  const others = known(owned).filter((r) => r !== id);

  if (id === 'hourglass') {
    const secs = played.reduce((s, l) => s + (l.seconds ?? DEFAULT_SECONDS), 0);
    const extra = secondsBonus([id]);
    const alone = Math.round((total(played, []) / secs) * extra);
    const combined = Math.round((total(played, others) / secs) * extra);
    return { alone, combined, synergy: combined > alone, hits: 0 };
  }
  if (!isScoring(id)) return null;

  const n = played.length;
  const alone = Math.round((total(played, [id]) - total(played, [])) / n);
  const combined = Math.round((total(played, [...others, id]) - total(played, others)) / n);
  return { alone, combined, synergy: combined > alone, hits: hitCount(played, id) };
}
