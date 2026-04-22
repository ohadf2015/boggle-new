/**
 * Rune Card Catalog — active rune definitions for Word Forge mode.
 *
 * Every id here must have a registered evaluator in runeEngine.ts (enforced
 * by lib/wordForge/__tests__/runeParity.test.ts). A small number of runes
 * (timeWarp, hintWhisper, bigGrid) are implemented by run/grid/timer managers
 * outside the scoring evaluator; their evaluators return null by design.
 */

import type { RuneCardDef } from '@/types/wordForge';

export const RUNE_CATALOG: RuneCardDef[] = [
  // ─── CHIP RUNES (13) ────────────────────────────────────────

  // Common Chips (10)
  { id: 'vowelMiner', name: 'Vowel Miner', descriptionKey: 'wordForge.rune.vowelMiner', category: 'chip', rarity: 'common', icon: '🔷', unlockTier: 0 },
  { id: 'longHaul', name: 'Long Haul', descriptionKey: 'wordForge.rune.longHaul', category: 'chip', rarity: 'common', icon: '📏', unlockTier: 0 },
  { id: 'firstBlood', name: 'First Blood', descriptionKey: 'wordForge.rune.firstBlood', category: 'chip', rarity: 'common', icon: '⚡', unlockTier: 0 },
  { id: 'doubleDown', name: 'Double Down', descriptionKey: 'wordForge.rune.doubleDown', category: 'chip', rarity: 'common', icon: '🎲', unlockTier: 0 },
  { id: 'rareFinder', name: 'Rare Finder', descriptionKey: 'wordForge.rune.rareFinder', category: 'chip', rarity: 'common', icon: '💎', unlockTier: 0 },
  { id: 'consonantClub', name: 'Consonant Club', descriptionKey: 'wordForge.rune.consonantClub', category: 'chip', rarity: 'common', icon: '🏛️', unlockTier: 1 },
  { id: 'shortSprint', name: 'Short Sprint', descriptionKey: 'wordForge.rune.shortSprint', category: 'chip', rarity: 'common', icon: '🏃', unlockTier: 1 },
  { id: 'sweetSpot', name: 'Sweet Spot', descriptionKey: 'wordForge.rune.sweetSpot', category: 'chip', rarity: 'common', icon: '🎯', unlockTier: 1 },
  { id: 'cleanSlate', name: 'Clean Slate', descriptionKey: 'wordForge.rune.cleanSlate', category: 'chip', rarity: 'common', icon: '✨', unlockTier: 1 },
  { id: 'perfectFive', name: 'Perfect Five', descriptionKey: 'wordForge.rune.perfectFive', category: 'chip', rarity: 'common', icon: '⭐', unlockTier: 2 },

  // Rare Chips (3)
  { id: 'palindromePrize', name: 'Palindrome Prize', descriptionKey: 'wordForge.rune.palindromePrize', category: 'chip', rarity: 'rare', icon: '🔄', unlockTier: 2 },
  { id: 'streakBonus', name: 'Streak Bonus', descriptionKey: 'wordForge.rune.streakBonus', category: 'chip', rarity: 'rare', icon: '🔥', unlockTier: 3 },
  { id: 'wordHoarder', name: 'Word Hoarder', descriptionKey: 'wordForge.rune.wordHoarder', category: 'chip', rarity: 'rare', icon: '📚', unlockTier: 3 },
  { id: 'sharpEdge', name: 'Sharp Edge', descriptionKey: 'wordForge.rune.sharpEdge', category: 'chip', rarity: 'rare', icon: '🔪', unlockTier: 2 },

  // ─── MULT RUNES (13) ────────────────────────────────────────

  // Common Mults (5)
  { id: 'wordSmith', name: 'Word Smith', descriptionKey: 'wordForge.rune.wordSmith', category: 'mult', rarity: 'common', icon: '🔨', unlockTier: 0 },
  { id: 'comboFire', name: 'Combo Fire', descriptionKey: 'wordForge.rune.comboFire', category: 'mult', rarity: 'common', icon: '🔥', unlockTier: 0 },
  { id: 'alliteration', name: 'Alliteration', descriptionKey: 'wordForge.rune.alliteration', category: 'mult', rarity: 'common', icon: '🅰️', unlockTier: 0 },
  { id: 'chainLink', name: 'Chain Link', descriptionKey: 'wordForge.rune.chainLink', category: 'mult', rarity: 'rare', icon: '🔗', unlockTier: 0 },
  { id: 'speedDemon', name: 'Speed Demon', descriptionKey: 'wordForge.rune.speedDemon', category: 'mult', rarity: 'common', icon: '⚡', unlockTier: 0 },

  // Rare Mults (7)
  { id: 'criticalHit', name: 'Critical Hit', descriptionKey: 'wordForge.rune.criticalHit', category: 'mult', rarity: 'rare', icon: '💥', unlockTier: 1 },
  { id: 'palindromePower', name: 'Palindrome Power', descriptionKey: 'wordForge.rune.palindromePower', category: 'mult', rarity: 'rare', icon: '🔁', unlockTier: 2 },
  { id: 'crescendo', name: 'Crescendo', descriptionKey: 'wordForge.rune.crescendo', category: 'mult', rarity: 'rare', icon: '📈', unlockTier: 2 },
  { id: 'frontLoad', name: 'Front Load', descriptionKey: 'wordForge.rune.frontLoad', category: 'mult', rarity: 'rare', icon: '🚀', unlockTier: 3 },
  { id: 'vowelPower', name: 'Vowel Power', descriptionKey: 'wordForge.rune.vowelPower', category: 'mult', rarity: 'rare', icon: '🅾️', unlockTier: 3 },
  { id: 'weightedWords', name: 'Weighted Words', descriptionKey: 'wordForge.rune.weightedWords', category: 'mult', rarity: 'rare', icon: '⚖️', unlockTier: 2 },

  // Legendary Mults (1)
  { id: 'grandMaster', name: 'Grand Master', descriptionKey: 'wordForge.rune.grandMaster', category: 'mult', rarity: 'legendary', icon: '👑', unlockTier: 4 },

  // ─── SPECIAL RUNES (4) ──────────────────────────────────────

  // Common Specials (3) — timeWarp/hintWhisper handled by managers, not evaluator
  { id: 'echo', name: 'Echo', descriptionKey: 'wordForge.rune.echo', category: 'special', rarity: 'common', icon: '🔊', unlockTier: 0 },
  { id: 'timeWarp', name: 'Time Warp', descriptionKey: 'wordForge.rune.timeWarp', category: 'special', rarity: 'common', icon: '⏱️', unlockTier: 0 },
  { id: 'hintWhisper', name: 'Hint Whisper', descriptionKey: 'wordForge.rune.hintWhisper', category: 'special', rarity: 'common', icon: '💡', unlockTier: 0 },

  // Rare Specials (1) — bigGrid handled by grid manager
  { id: 'bigGrid', name: 'Big Grid', descriptionKey: 'wordForge.rune.bigGrid', category: 'special', rarity: 'rare', icon: '📐', unlockTier: 1 },

  // ─── CURSED RUNES (10) ──────────────────────────────────────

  // Tier 3 Cursed (3)
  { id: 'tunnelVision', name: 'Tunnel Vision', descriptionKey: 'wordForge.rune.tunnelVision', category: 'cursed', rarity: 'rare', icon: '🔭', unlockTier: 3 },
  { id: 'berserker', name: 'Berserker', descriptionKey: 'wordForge.rune.berserker', category: 'cursed', rarity: 'rare', icon: '⚔️', unlockTier: 3 },
  { id: 'gamblerRune', name: 'Gambler', descriptionKey: 'wordForge.rune.gamblerRune', category: 'cursed', rarity: 'rare', icon: '🎲', unlockTier: 3 },

  // Tier 4 Cursed (4)
  { id: 'glassCannon', name: 'Glass Cannon', descriptionKey: 'wordForge.rune.glassCannon', category: 'cursed', rarity: 'rare', icon: '💠', unlockTier: 4 },
  { id: 'debtCollector', name: 'Debt Collector', descriptionKey: 'wordForge.rune.debtCollector', category: 'cursed', rarity: 'rare', icon: '💸', unlockTier: 4 },
  { id: 'noRepeat', name: 'No Repeat Policy', descriptionKey: 'wordForge.rune.noRepeat', category: 'cursed', rarity: 'legendary', icon: '🚫', unlockTier: 4 },
  { id: 'timeStarved', name: 'Time Starved', descriptionKey: 'wordForge.rune.timeStarved', category: 'cursed', rarity: 'legendary', icon: '⏳', unlockTier: 4 },

  // Tier 5 Cursed (3)
  { id: 'oathOfSilence', name: 'Oath of Silence', descriptionKey: 'wordForge.rune.oathOfSilence', category: 'cursed', rarity: 'legendary', icon: '🤫', unlockTier: 5 },
  { id: 'overload', name: 'Overload', descriptionKey: 'wordForge.rune.overload', category: 'cursed', rarity: 'legendary', icon: '🔋', unlockTier: 5 },
  { id: 'lastStand', name: 'Last Stand', descriptionKey: 'wordForge.rune.lastStand', category: 'cursed', rarity: 'legendary', icon: '⚰️', unlockTier: 5 },
];

/** Get runes available at a given unlock tier */
export function getAvailableRunes(unlockTier: number): RuneCardDef[] {
  return RUNE_CATALOG.filter(r => r.unlockTier <= unlockTier);
}

/** Get runes filtered by rarity */
export function getRunesByRarity(
  runes: RuneCardDef[],
  rarity: RuneCardDef['rarity'],
): RuneCardDef[] {
  return runes.filter(r => r.rarity === rarity);
}

/**
 * Generate 3 rune offerings for a pick-one screen.
 *
 * Rarity weights shift by round:
 * - Round 1-2: 80% common, 20% rare, 0% legendary
 * - Round 3-5: 60% common, 35% rare, 5% legendary
 * - Round 6+:  40% common, 40% rare, 20% legendary
 *
 * Never offers runes the player already has.
 */
export function generateRuneOffering(
  round: number,
  unlockTier: number,
  equippedRuneIds: string[],
): RuneCardDef[] {
  const available = getAvailableRunes(unlockTier).filter(
    r => !equippedRuneIds.includes(r.id),
  );

  if (available.length <= 3) return available;

  // Determine rarity weights by round
  let weights: Record<string, number>;
  if (round <= 2) {
    weights = { common: 80, rare: 20, legendary: 0 };
  } else if (round <= 5) {
    weights = { common: 60, rare: 35, legendary: 5 };
  } else {
    weights = { common: 40, rare: 40, legendary: 20 };
  }

  const picks: RuneCardDef[] = [];
  const used = new Set<string>();

  for (let i = 0; i < 3; i++) {
    // Roll rarity
    const roll = Math.random() * 100;
    let targetRarity: string;
    if (roll < weights.legendary) {
      targetRarity = 'legendary';
    } else if (roll < weights.legendary + weights.rare) {
      targetRarity = 'rare';
    } else {
      targetRarity = 'common';
    }

    // Find a rune of that rarity
    const candidates = available.filter(
      r => r.rarity === targetRarity && !used.has(r.id),
    );

    // Fallback to any available if none of target rarity
    const pool = candidates.length > 0
      ? candidates
      : available.filter(r => !used.has(r.id));

    if (pool.length === 0) break;

    const pick = pool[Math.floor(Math.random() * pool.length)];
    picks.push(pick);
    used.add(pick.id);
  }

  return picks;
}
