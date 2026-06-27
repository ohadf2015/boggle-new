import { createElement, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { diffNewlyUnlocked, type PlayerCosmeticState } from '@/lib/cosmetics';
import { useLanguage } from '@/contexts/LanguageContext';

// v2: the unlock axis changed from the never-fetched profile.rank_tier (which
// snapshotted a bogus capitalized 'Bronze'/0 for everyone) to the score-based
// leaderboard tier. Bumping the key discards stale baselines so the first load
// after the fix re-seeds cleanly instead of firing a burst of "unlocked" toasts.
const SNAPSHOT_KEY = 'lexiclash_cosmetics_snapshot_v2';

interface NotifierInput {
  rankTier: string;
  streakDays: number;
  /** Optional already-purchased ids — defaults to []. Purchase notifications fire elsewhere. */
  purchasedIds?: string[];
}

interface Snapshot {
  rankTier: string;
  streakDays: number;
}

function readSnapshot(): Snapshot | null {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(SNAPSHOT_KEY) : null;
    return raw ? (JSON.parse(raw) as Snapshot) : null;
  } catch {
    return null;
  }
}

function writeSnapshot(snap: Snapshot): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snap));
    }
  } catch { /* storage unavailable */ }
}

/**
 * Detects newly-unlocked cosmetics between the persisted last-seen snapshot
 * and the current player state, and fires a toast for each one.
 *
 * Mount this once in a top-level shell (e.g. profile page or app root) so
 * rank-ups and streak milestones surface a notification without the player
 * having to dig through the cosmetics tab.
 */
export function useUnlockNotifier(input: NotifierInput): void {
  const { t, language } = useLanguage();
  const lastNotifiedRef = useRef<string>('');
  const { rankTier, streakDays, purchasedIds } = input;

  useEffect(() => {
    const prior = readSnapshot();
    const current: Snapshot = { rankTier, streakDays };
    const currentKey = `${current.rankTier}|${current.streakDays}`;

    if (lastNotifiedRef.current === currentKey) return;

    if (!prior) {
      writeSnapshot(current);
      lastNotifiedRef.current = currentKey;
      return;
    }

    if (prior.rankTier === current.rankTier && prior.streakDays === current.streakDays) {
      return;
    }

    const ownedIds = purchasedIds ?? [];
    const baseState: PlayerCosmeticState = {
      rankTier: prior.rankTier,
      streakDays: prior.streakDays,
      coins: 0,
      seasonRewards: [],
      purchasedIds: ownedIds,
      equippedIds: {},
    };
    const nextState: PlayerCosmeticState = {
      ...baseState,
      rankTier: current.rankTier,
      streakDays: current.streakDays,
    };

    const newly = diffNewlyUnlocked(baseState, nextState);
    const href = `/${language}/profile?tab=collection`;
    for (const c of newly) {
      // Clickable toast — deep-links to the collection so the unlock turns into
      // an equip, instead of a dead-end announcement the player can't act on.
      toast.success(
        createElement(
          'a',
          {
            href,
            className: 'flex flex-col gap-0.5 font-neo-body text-neo-black no-underline',
          },
          createElement('span', { className: 'text-sm font-bold' }, t('cosmetics.unlockedToast', { name: t(c.name) })),
          createElement('span', { className: 'text-xs underline opacity-80' }, t('cosmetics.equipCta')),
        ),
        { duration: 6000 },
      );
    }

    writeSnapshot(current);
    lastNotifiedRef.current = currentKey;
  }, [rankTier, streakDays, purchasedIds, t, language]);
}
