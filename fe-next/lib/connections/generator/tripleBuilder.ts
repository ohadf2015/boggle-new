import type { Triple } from './validator';

export function buildTriplesFromCompounds(compounds: string[]): Triple[] {
  const incoming = new Map<string, Set<string>>();
  const outgoing = new Map<string, Set<string>>();
  const seen = new Set<string>();

  for (const raw of compounds) {
    const compound = raw.trim();
    if (seen.has(compound)) continue;
    seen.add(compound);
    const parts = compound.split(/\s+/);
    if (parts.length !== 2) continue;
    const [a, b] = parts;
    if (!a || !b || a === b) continue;
    if (!incoming.has(b)) incoming.set(b, new Set());
    incoming.get(b)!.add(a);
    if (!outgoing.has(a)) outgoing.set(a, new Set());
    outgoing.get(a)!.add(b);
  }

  const out: Triple[] = [];
  const dedup = new Set<string>();
  for (const [bridge, lefts] of incoming) {
    const rights = outgoing.get(bridge);
    if (!rights) continue;
    for (const w1 of lefts) {
      for (const w2 of rights) {
        if (w1 === bridge || w2 === bridge || w1 === w2) continue;
        const key = `${w1}|${bridge}|${w2}`;
        if (dedup.has(key)) continue;
        dedup.add(key);
        out.push({ word1: w1, bridge, word2: w2 });
      }
    }
  }
  return out;
}
