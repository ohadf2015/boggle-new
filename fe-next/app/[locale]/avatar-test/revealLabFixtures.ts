/**
 * Track C fixture knobs for /avatar-test?view=reveal (capture harness only).
 *   &from=N          previous level (default level-1) → several unlocks at once
 *   &guest=1         guest branch (sign-up tease)
 *   &motion=static   force the reduced-motion static burst
 *   &rarity=rare|epic|legendary   force the rarity treatment for captures
 *   &open=0          start with the reveal closed (see chip / hint / header entry)
 *   &fail=1          make "Equip now" fail (error state)
 */
import type { VisualTier } from '@/lib/avatar/rarity';
import { buildUnlockReveal, type UnlockReveal } from '@/lib/avatar/revealTrigger';

export interface RevealLabKnobs {
  from: number;
  guest: boolean;
  staticMotion: boolean;
  rarity: VisualTier | null;
  open: boolean;
  failEquip: boolean;
}

const FORCEABLE: readonly VisualTier[] = ['common', 'rare', 'epic', 'legendary'];

export function parseRevealLabKnobs(search: string, level: number): RevealLabKnobs {
  const q = new URLSearchParams(search);
  const rawFrom = Math.floor(Number(q.get('from')));
  const from = Number.isFinite(rawFrom) && q.get('from') !== null
    ? Math.min(level - 1, Math.max(1, rawFrom))
    : Math.max(1, level - 1);
  const r = q.get('rarity');
  return {
    from,
    guest: q.get('guest') === '1',
    staticMotion: q.get('motion') === 'static',
    rarity: r && (FORCEABLE as readonly string[]).includes(r) ? (r as VisualTier) : null,
    open: q.get('open') !== '0',
    failEquip: q.get('fail') === '1',
  };
}

/** The real ladder reveal for from→level (lab ignores session memory). */
export function fixtureReveal(level: number, knobs: RevealLabKnobs): UnlockReveal | null {
  const reveal = buildUnlockReveal({ oldLevel: knobs.from, newLevel: level }, { includeRevealed: true });
  if (!reveal || !knobs.rarity) return reveal;
  const rarity = knobs.rarity;
  return { ...reveal, rarity, unlocks: reveal.unlocks.map(u => ({ ...u, rarity })) };
}
