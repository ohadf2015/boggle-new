import type { HolidayKey } from './calendar';
import { dayNumber, fnv1a } from './hash';

export const HUNT_SLOTS = [
  'profile', 'settings', 'friends', 'leaderboard', 'quests', 'adventure',
  'howToPlay', 'daily', 'results', 'avatar', 'community', 'notFound',
] as const;
export type HuntSlot = (typeof HUNT_SLOTS)[number];

export const HUNT_ITEMS: Record<HolidayKey, readonly string[]> = {
  hanukkah: ['doughnut', 'dreidel', 'gelt', 'latke'],
  christmas: ['ornament', 'elf', 'gingerbread', 'snowman', 'candycane'],
};

export const HUNT_GOAL: Record<HolidayKey, number> = { hanukkah: 8, christmas: 12 };
export const SEEKER_PART: Record<HolidayKey, string> = {
  hanukkah: 'accessory:goldDreidelPin',
  christmas: 'accessory:goldOrnament',
};

export function isHuntSlot(v: unknown): v is HuntSlot {
  return typeof v === 'string' && (HUNT_SLOTS as readonly string[]).includes(v);
}

export function huntSlotFor(userId: string, localDate: string): HuntSlot {
  return HUNT_SLOTS[fnv1a(`${userId}|${localDate}|hunt`) % HUNT_SLOTS.length];
}

export function huntItemFor(holiday: HolidayKey, localDate: string): string {
  const items = HUNT_ITEMS[holiday];
  return items[((dayNumber(localDate) % items.length) + items.length) % items.length];
}
