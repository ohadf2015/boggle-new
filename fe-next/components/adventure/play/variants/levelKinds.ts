/**
 * Level-kind presentation data shared by the intro card and the map.
 * Kinds/twists come from lib/adventure/play/levels (the one level table);
 * this file only decides how they LOOK and how threatening they read.
 */
import { BookOpen, Search, Link2, CloudFog, Bomb, Swords, Skull, type LucideIcon } from 'lucide-react';
import type { LevelKind, PlayLevel } from '@/lib/adventure/play/levels';

export interface KindMeta { icon: LucideIcon; bg: string; hex: string }

/** Tailwind bg + raw hex (for inline glows/borders) per kind. */
export const KIND_META: Record<LevelKind, KindMeta> = {
  classic: { icon: BookOpen, bg: 'bg-neo-cyan', hex: '#00ffff' },
  hunt: { icon: Search, bg: 'bg-neo-lime', hex: '#bfff00' },
  chain: { icon: Link2, bg: 'bg-neo-yellow', hex: '#ffe135' },
  fog: { icon: CloudFog, bg: 'bg-neo-purple', hex: '#8b5cf6' },
  bomb: { icon: Bomb, bg: 'bg-neo-orange', hex: '#ff6b35' },
  elite: { icon: Swords, bg: 'bg-neo-pink', hex: '#ff1493' },
  boss: { icon: Skull, bg: 'bg-neo-red', hex: '#ff3366' },
};

const SLOT_BASE = [1, 1, 2, 0, 2, 3];

/** 1-5 threat pips: rises through a world, spikes at the elite, maxes at the boss, climbs per world. */
export function levelThreat(lvl: Pick<PlayLevel, 'world' | 'level' | 'kind'>): number {
  if (lvl.kind === 'boss') return 5;
  const bonus = Math.floor((lvl.world - 1) / 4);
  if (lvl.kind === 'elite') return Math.min(5, SLOT_BASE[2] + bonus + 1);
  return Math.min(4, (SLOT_BASE[lvl.level - 1] ?? 3) + bonus);
}

const KIND_TWISTS = new Set<string>(['hunt', 'chain', 'fog', 'bomb']);

export interface RuleKeys {
  /** One-sentence rule for the level kind (the "new" sentence when this world introduces it). */
  main: string;
  /** Extra line for modifier twists (rush, long words, blackout...). */
  modifier?: string;
  /** This level carries the world's new rule. */
  isNew: boolean;
}

/** i18n keys for the intro card's rule lines (Balatro-style: one sentence per rule). */
export function ruleKeysOf(lvl: Pick<PlayLevel, 'kind' | 'twist'>): RuleKeys {
  const { kind, twist } = lvl;
  if (twist && KIND_TWISTS.has(twist) && twist === kind) return { main: `adventurePlay.variety.twist.${twist}`, isNew: true };
  const out: RuleKeys = { main: `adventurePlay.variety.rule.${kind}`, isNew: !!twist };
  if (twist) out.modifier = `adventurePlay.variety.twist.${twist}`;
  return out;
}

export type PathState = 'cleared' | 'current' | 'ahead';

/** Where a level sits on the active run's path (null = no run in progress). */
export function runPathState(level: number, runStep: number | null): PathState | null {
  if (runStep == null) return null;
  return level < runStep ? 'cleared' : level === runStep ? 'current' : 'ahead';
}
