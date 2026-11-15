import { computeSocialTier } from '@/lib/families/socialPolicy';

export interface ShieldInputs {
  memberIds: Iterable<string>;
  consentIds: Iterable<string>;
  birthYears: ReadonlyMap<string, number | null | undefined>;
}

/**
 * Players kept away from stranger contact (rival pings, rival cards): anyone with a parental consent, and any class
 * member who has not declared an adult age. A declared adult in a class is usually a teacher trying their own room.
 */
export function shieldedIds({ memberIds, consentIds, birthYears }: ShieldInputs, now = new Date()): Set<string> {
  const out = new Set(consentIds);
  const year = now.getUTCFullYear();
  for (const id of memberIds) {
    if (computeSocialTier(birthYears.get(id), year) !== 'adult') out.add(id);
  }
  return out;
}
