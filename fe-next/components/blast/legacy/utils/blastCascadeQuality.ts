/**
 * Cascade find selection — the anti-"super cascade" quality gate.
 *
 * Previously each chain level cleared up to 2 finds (cluster + word) from 3
 * detectors, so a 4-5 deep chain could empty most of the board. Now each chain
 * level clears exactly ONE find (best cluster, else longest word), and from
 * CASCADE_QUALITY_MIN_CHAIN onward only "quality" matches sustain the chain —
 * long chains stay possible but rare, which is the variable-ratio sweet spot.
 */
import {
  CASCADE_QUALITY_MIN_CHAIN,
  CASCADE_QUALITY_MIN_CLUSTER,
  CASCADE_QUALITY_MIN_WORD_LEN,
} from '../types';

interface FindLike {
  cells: Array<{ row: number; col: number }>;
  /** Cluster labels are bracketed ("[A×4]"); word labels are the word itself. */
  label: string;
}

const isCluster = (f: FindLike) => f.label.startsWith('[');

export function selectCascadeFinds<T extends FindLike>(finds: T[], chainLevel: number): T[] {
  if (finds.length === 0) return [];

  const clusters = finds.filter(isCluster).sort((a, b) => b.cells.length - a.cells.length);
  const words = finds.filter((f) => !isCluster(f)).sort((a, b) => b.cells.length - a.cells.length);
  const best = clusters[0] ?? words[0];
  if (!best) return [];

  if (chainLevel >= CASCADE_QUALITY_MIN_CHAIN) {
    const quality = isCluster(best)
      ? best.cells.length >= CASCADE_QUALITY_MIN_CLUSTER
      : best.cells.length >= CASCADE_QUALITY_MIN_WORD_LEN;
    if (!quality) return [];
  }
  return [best];
}
