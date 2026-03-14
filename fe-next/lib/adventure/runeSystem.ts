/**
 * Rune System — forge rune fragments into permanent runes with gameplay effects.
 *
 * Players earn fragments from 3-star level completions (1 per level, 70 max).
 * Fragments are consumed to forge runes (3 fragments each).
 * Up to 3 runes can be equipped at once for stacking bonuses.
 */

// ==============================================
// TYPES
// ==============================================

export interface RuneDefinition {
  id: string;
  nameKey: string;
  descriptionKey: string;
  fragmentCost: number;
  effect: RuneEffect;
  icon: string;
}

export interface RuneEffect {
  scoreMultiplier?: number;  // e.g. 1.1 = +10% score
  goldMultiplier?: number;   // e.g. 1.15 = +15% gold
  timeBonus?: number;        // bonus seconds per level
  comboDecay?: number;       // e.g. 0.8 = 20% slower combo decay
  hintBonus?: number;        // extra hints per level
  bossDamage?: number;       // e.g. 1.2 = +20% boss damage
}

export interface RuneState {
  runeId: string;
  equipped: boolean;
}

export interface RuneEffects {
  scoreMultiplier: number;
  goldMultiplier: number;
  timeBonus: number;
  comboDecay: number;
  hintBonus: number;
  bossDamage: number;
}

// ==============================================
// RUNE DEFINITIONS
// ==============================================

export const MAX_EQUIPPED_RUNES = 3;

export const RUNE_DEFINITIONS: RuneDefinition[] = [
  {
    id: 'rune-swiftword',
    nameKey: 'adventure.runes.swiftword.name',
    descriptionKey: 'adventure.runes.swiftword.desc',
    fragmentCost: 3,
    effect: { scoreMultiplier: 1.1 },
    icon: '/images/runes/rune-swiftword.webp',
  },
  {
    id: 'rune-goldvein',
    nameKey: 'adventure.runes.goldvein.name',
    descriptionKey: 'adventure.runes.goldvein.desc',
    fragmentCost: 3,
    effect: { goldMultiplier: 1.15 },
    icon: '/images/runes/rune-goldvein.webp',
  },
  {
    id: 'rune-timewarp',
    nameKey: 'adventure.runes.timewarp.name',
    descriptionKey: 'adventure.runes.timewarp.desc',
    fragmentCost: 3,
    effect: { timeBonus: 15 },
    icon: '/images/runes/rune-timewarp.webp',
  },
  {
    id: 'rune-momentum',
    nameKey: 'adventure.runes.momentum.name',
    descriptionKey: 'adventure.runes.momentum.desc',
    fragmentCost: 3,
    effect: { comboDecay: 0.7 },
    icon: '/images/runes/rune-momentum.webp',
  },
  {
    id: 'rune-insight',
    nameKey: 'adventure.runes.insight.name',
    descriptionKey: 'adventure.runes.insight.desc',
    fragmentCost: 3,
    effect: { hintBonus: 2 },
    icon: '/images/runes/rune-insight.webp',
  },
  {
    id: 'rune-wrath',
    nameKey: 'adventure.runes.wrath.name',
    descriptionKey: 'adventure.runes.wrath.desc',
    fragmentCost: 3,
    effect: { bossDamage: 1.25 },
    icon: '/images/runes/rune-wrath.webp',
  },
];

// ==============================================
// FORGE LOGIC
// ==============================================

function getRuneDef(runeId: string): RuneDefinition | undefined {
  return RUNE_DEFINITIONS.find(r => r.id === runeId);
}

/** Check if a rune can be forged */
export function canForgeRune(
  runeId: string,
  availableFragments: number,
  currentRunes: RuneState[],
): boolean {
  const def = getRuneDef(runeId);
  if (!def) return false;
  if (currentRunes.some(r => r.runeId === runeId)) return false;
  return availableFragments >= def.fragmentCost;
}

/** Forge a rune — returns new state or null if cannot forge */
export function forgeRune(
  runeId: string,
  availableFragments: number,
  currentRunes: RuneState[],
): { runeState: RuneState[]; remainingFragments: number } | null {
  if (!canForgeRune(runeId, availableFragments, currentRunes)) return null;
  const def = getRuneDef(runeId)!;
  return {
    runeState: [...currentRunes, { runeId, equipped: false }],
    remainingFragments: availableFragments - def.fragmentCost,
  };
}

// ==============================================
// EQUIP / EFFECTS
// ==============================================

/** Calculate combined effects from all equipped runes */
export function getEquippedRuneEffects(runes: RuneState[]): RuneEffects {
  const base: RuneEffects = {
    scoreMultiplier: 1.0,
    goldMultiplier: 1.0,
    timeBonus: 0,
    comboDecay: 1.0,
    hintBonus: 0,
    bossDamage: 1.0,
  };

  for (const rune of runes) {
    if (!rune.equipped) continue;
    const def = getRuneDef(rune.runeId);
    if (!def) continue;

    const e = def.effect;
    if (e.scoreMultiplier) base.scoreMultiplier *= e.scoreMultiplier;
    if (e.goldMultiplier) base.goldMultiplier *= e.goldMultiplier;
    if (e.timeBonus) base.timeBonus += e.timeBonus;
    if (e.comboDecay) base.comboDecay *= e.comboDecay;
    if (e.hintBonus) base.hintBonus += e.hintBonus;
    if (e.bossDamage) base.bossDamage *= e.bossDamage;
  }

  return base;
}

/** Toggle equip state of a rune (respects MAX_EQUIPPED_RUNES limit) */
export function toggleRuneEquip(
  runeId: string,
  currentRunes: RuneState[],
): RuneState[] | null {
  const idx = currentRunes.findIndex(r => r.runeId === runeId);
  if (idx === -1) return null; // rune not forged

  const rune = currentRunes[idx];
  if (!rune.equipped) {
    // Check equip limit
    const equippedCount = currentRunes.filter(r => r.equipped).length;
    if (equippedCount >= MAX_EQUIPPED_RUNES) return null;
  }

  const newRunes = [...currentRunes];
  newRunes[idx] = { ...rune, equipped: !rune.equipped };
  return newRunes;
}
