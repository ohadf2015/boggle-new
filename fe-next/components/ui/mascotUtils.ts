/**
 * Mascot utility functions and type mappings
 * Pure utilities without React dependencies
 */

import { type MascotVariant } from './mascotData';

/**
 * Extended variants for semantic meaning - ALL map to 7 GIF variants
 * These provide better semantic names for different contexts
 */
export type MoodVariant =
  | 'confused'      // → thinking
  | 'proud'         // → trophy
  | 'nervous'       // → scared
  | 'sad'           // → crying
  | 'winking'       // → happy
  | 'celebrating'   // → celebration
  | 'victory'       // → celebration
  | 'excited'       // → onfire
  | 'pointing'      // → happy
  | 'surprised'     // → mindblown
  | 'sleepy'        // → bored
  | 'focused';      // → thinking

/**
 * Activity-based variants - ALL map to 7 GIF variants
 */
export type ActivityVariant =
  | 'eating_pizza'     // → happy
  | 'drinking_coffee'  // → thinking
  | 'dancing'          // → dj
  | 'holding_trophy'   // → trophy
  | 'holding_sign'     // → happy
  | 'cheering'         // → celebration
  | 'skateboarding';   // → gaming

/**
 * Extended mascot variants including semantic aliases
 */
export type ExtendedMascotVariant = MascotVariant | MoodVariant | ActivityVariant;

/**
 * Mapping table: ALL extended variants → 7 GIF variants
 * Now includes: happy, gaming, thinking, oops, celebration, dj, trophy
 */
export const VARIANT_MAP: Record<string, MascotVariant> = {
  // Mood variants
  confused: 'thinking',
  proud: 'trophy',
  nervous: 'scared',
  sad: 'crying',
  winking: 'happy',
  celebrating: 'celebration',
  victory: 'celebration',
  excited: 'onfire',
  pointing: 'happy',
  surprised: 'mindblown',
  sleepy: 'bored',
  focused: 'thinking',
  // Activity variants
  eating_pizza: 'happy',
  drinking_coffee: 'thinking',
  dancing: 'dj',
  holding_trophy: 'trophy',
  holding_sign: 'happy',
  cheering: 'celebration',
  skateboarding: 'gaming',
};

/**
 * All base GIF variants
 */
export const BASE_VARIANTS: MascotVariant[] = [
  'happy',
  'gaming',
  'thinking',
  'oops',
  'celebration',
  'dj',
  'trophy',
  'panic',
  'crying',
  'onfire',
  'bored',
  'mindblown',
  'encouraging',
  'explorer',
  'flexing',
  'scared',
  'shopkeeper',
  'spectating',
  'waving',
  'powerup',
  'sleepy',
  'waiting',
  'gg',
  'scholar',
  'rage',
  'bomber',
  'winner',
  'knight',
  'sad',
  'ghostly',
  'dance',
  'question',
];

/**
 * Get the base GIF variant for any ExtendedMascotVariant
 * ALL extended variants map to one of 7 GIF variants
 */
export function getBaseVariant(variant: ExtendedMascotVariant): MascotVariant {
  // If it's already a base variant, return as-is
  if (BASE_VARIANTS.includes(variant as MascotVariant)) {
    return variant as MascotVariant;
  }
  // Map extended variant to base GIF variant
  return VARIANT_MAP[variant] || 'happy';
}
