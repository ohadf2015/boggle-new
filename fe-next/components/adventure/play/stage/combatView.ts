/**
 * Pure view helpers for the combat stage: HP segments, hearts, which art frame,
 * which status banner a step earns, which sound cue. No React.
 */
import { getBossImagePath } from '@/lib/adventure/bossConfig';
import type { CombatFx } from '@/lib/adventure/play/combat';
import { SIGNATURES, signatureOf } from '@/lib/adventure/play/enemyScripts';

export type ArtState = 'idle' | 'hurt' | 'attack' | 'enraged' | 'defeated';

/** Enemy HP as `n` chunky segments (Bookworm-style), each a 0..1 fill. */
export function hpSegments(hp: number, max: number, n: number): number[] {
  if (max <= 0) return Array(n).fill(0);
  const per = max / n;
  return Array.from({ length: n }, (_, i) => Math.round(Math.min(1, Math.max(0, (hp - i * per) / per)) * 100) / 100);
}

export function heartStates(hp: number, maxHp: number): Array<'full' | 'empty'> {
  return Array.from({ length: maxHp }, (_, i) => (i < hp ? 'full' : 'empty'));
}

export function enemyArt(world: number, isBoss: boolean, state: ArtState): string {
  if (isBoss) return getBossImagePath(world, state);
  const frame = state === 'enraged' ? 'idle' : state === 'defeated' ? 'hurt' : state;
  return `/images/adventure/enemies/w${world}-${frame}.webp`;
}

export const projectileArt = (world: number) =>
  SIGNATURES[Math.min(10, Math.max(1, world)) - 1].includes('freeze')
    ? '/images/adventure/fx/ice-shard.webp'
    : '/images/adventure/fx/fireball.webp';

export type StatusId =
  | 'death' | 'defeated' | 'revive' | 'phase' | 'interrupt' | 'blocked' | 'freeze' | 'curse'
  | 'shuffle' | 'drain' | 'hit' | 'deflect' | 'cleanse' | 'heal';

const STATUS_ORDER: StatusId[] = [
  'death', 'defeated', 'revive', 'phase', 'interrupt', 'blocked', 'freeze', 'curse',
  'shuffle', 'drain', 'hit', 'deflect', 'cleanse', 'heal',
];

/** The one stamped banner a step earns (Petrified!/Stunned! style), or null. */
export function statusFor(fx: readonly CombatFx[]): StatusId | null {
  return STATUS_ORDER.find((s) => fx.includes(s)) ?? null;
}

export const ruleKey = (world: number, isBoss: boolean) =>
  isBoss ? `adventurePlay.combat.rule.w${world}` : `adventurePlay.combat.eliteRule.${signatureOf(world)}`;

export const moveKey = (attackId: string) => `adventurePlay.combat.move.${attackId}`;

/** Sound cue per fx, in priority order; the first match of each group plays. */
const SOUND_GROUPS: Array<[CombatFx[], string]> = [
  [['defeated'], 'playBossDefeatSound'],
  [['death'], 'playDefeatSound'],
  [['phase'], 'playBossPhaseChangeSound'],
  [['interrupt'], 'playPerfectWordSound'],
  [['blocked', 'guard'], 'playPowerUpSound'],
  [['revive', 'heal'], 'playLevelUpSound'],
  [['hit', 'drain', 'curse'], 'playComboBreakSound'],
  [['deflect'], 'playTileSelectSound'],
  [['cleanse'], 'playHintRevealSound'],
  [['shuffle'], 'playBoardShuffleSound'],
  [['freeze', 'projectile'], 'playTimerUrgentSound'],
  [['telegraph'], 'playTimerHeartbeatSound'],
];

export function fxSounds(fx: readonly CombatFx[]): string[] {
  const out: string[] = [];
  for (const [group, sound] of SOUND_GROUPS) if (group.some((f) => fx.includes(f))) out.push(sound);
  // A finished fight owns the moment — no clutter under the finale sting.
  if (out[0] === 'playBossDefeatSound' || out[0] === 'playDefeatSound') return [out[0]];
  return out;
}
