/**
 * Master switch for the boss-fight RPG combat layer (parry, player ability kit,
 * elemental weakness crit).
 *
 * ENABLED. Adds the parry/defend loop, the player ability bar, and weakness
 * crits (boss damage ×1.6–2.0 on weakness hits). Set to false to revert boss
 * fights to the prior behaviour with zero balance/UI change.
 *
 * CAVEAT (one device check pending): the ability bar is a fixed-bottom docked
 * panel. Its non-overlap with the board at narrow phone widths (≤390px) was
 * defensively designed but could not be live-verified here (automation cannot
 * trigger the framer-motion level launch). Confirm on a real device; if the
 * panel covers board tiles, raise its `bottom` offset in BossOverlay.
 */
export const BOSS_RPG_COMBAT_ENABLED = true;
