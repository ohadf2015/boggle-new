import { useEffect } from 'react';
import { getUnlockedCosmetics, type PlayerCosmeticState } from '@/lib/cosmetics';
import { useLanguage } from '@/contexts/LanguageContext';
import { showCosmeticUnlockToast } from '@/components/cosmetics/CosmeticUnlockToast';

// Per-account record of cosmetic ids we have ALREADY announced. This is the
// source of truth for "notify once". The previous implementation kept only a
// {rankTier, streakDays} snapshot and re-derived "newly unlocked" from a diff —
// which re-fired the SAME unlock every time the streak dropped and re-climbed
// past a milestone (broke streak → recover) or the tier value churned. Tracking
// the announced ids directly makes each cosmetic fire exactly once per account,
// regardless of how rank/streak fluctuate afterwards.
const NOTIFIED_KEY = 'lexiclash_cosmetics_notified_v1';

interface NotifierInput {
  rankTier: string;
  streakDays: number;
  /** Optional already-purchased ids — defaults to []. Purchase notifications fire elsewhere. */
  purchasedIds?: string[];
  /** Account id — scopes the "already notified" record so different accounts on
   *  the same device dedup independently and never inherit each other's history. */
  accountId?: string;
}

function storageKey(accountId?: string): string {
  return accountId ? `${NOTIFIED_KEY}:${accountId}` : NOTIFIED_KEY;
}

function readNotified(key: string): Set<string> | null {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    if (raw == null) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.filter((v): v is string => typeof v === 'string')) : null;
  } catch {
    return null;
  }
}

function writeNotified(key: string, ids: Set<string>): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, JSON.stringify([...ids]));
    }
  } catch { /* storage unavailable */ }
}

/**
 * Detects newly-unlocked cosmetics and fires a toast for each one — exactly
 * once per account, ever.
 *
 * Mount this once in a top-level shell (e.g. the app root) so rank-ups and
 * streak milestones surface a notification without the player having to dig
 * through the cosmetics tab.
 *
 * First encounter for an account is a SILENT seed: every cosmetic the player
 * already owns is recorded without a toast, so we never blast a burst of
 * "unlocked!" capsules for things they earned long ago. After that, only
 * genuinely new ids produce a toast.
 */
export function useUnlockNotifier(input: NotifierInput): void {
  const { t, language, dir } = useLanguage();
  const { rankTier, streakDays, purchasedIds, accountId } = input;

  useEffect(() => {
    const key = storageKey(accountId);

    const state: PlayerCosmeticState = {
      rankTier,
      streakDays,
      coins: 0,
      seasonRewards: [],
      // Purchases are announced by their own flow; default to none so this
      // notifier only ever surfaces rank/streak (and default) unlocks.
      purchasedIds: purchasedIds ?? [],
      equippedIds: {},
    };

    const unlocked = getUnlockedCosmetics(state);
    const notified = readNotified(key);

    // First ever load for this account → seed silently, announce nothing.
    if (!notified) {
      writeNotified(key, new Set(unlocked.map((c) => c.id)));
      return;
    }

    const fresh = unlocked.filter((c) => !notified.has(c.id));
    if (fresh.length === 0) return;

    for (const c of fresh) {
      showCosmeticUnlockToast({ cosmetic: c, language, isRtl: dir === 'rtl', t });
      notified.add(c.id);
    }

    writeNotified(key, notified);
  }, [rankTier, streakDays, purchasedIds, accountId, t, language, dir]);
}
