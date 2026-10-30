import { useEffect, useRef, useState } from 'react';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';

export interface RivalScore {
  name: string;
  score: number;
  avatarImage: string | null;
  customAvatar: CustomAvatarConfig | null;
  playerId: string | null;
  guestFingerprint: string | null;
}

export function rivalKey(r: RivalScore): string {
  return r.playerId ? `p:${r.playerId}` : r.guestFingerprint ? `g:${r.guestFingerprint}` : `n:${r.name}`;
}

/** Rivals the score has just gone strictly above; records them in `passed` so each is celebrated once. */
export function newlyPassedRivals(rivals: readonly RivalScore[], score: number, passed: Set<string>): RivalScore[] {
  const out: RivalScore[] = [];
  for (const r of rivals) {
    const key = rivalKey(r);
    if (r.score > 0 && r.score < score && !passed.has(key)) {
      passed.add(key);
      out.push(r);
    }
  }
  return out;
}

interface LeaderboardRow {
  score?: number;
  display_name?: string;
  avatar_image?: string | null;
  custom_avatar?: CustomAvatarConfig | null;
  player_id?: string | null;
  guest_fingerprint?: string | null;
}

interface UseWheelRivalsArgs {
  enabled: boolean;
  language: string;
  puzzleDate?: string;
  currentPlayerId: string | null;
  currentGuestFingerprint: string | null;
}

/** The day's board as rivals: a snapshot on mount, refreshed every minute while the tab is visible. */
export function useWheelRivals({ enabled, language, puzzleDate, currentPlayerId, currentGuestFingerprint }: UseWheelRivalsArgs) {
  const [rivals, setRivals] = useState<RivalScore[]>([]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;
    const fetchRivals = async () => {
      try {
        // A catch-up replay races that day's board, not today's.
        const date = puzzleDate || new Date().toISOString().split('T')[0];
        const res = await fetch(`/api/daily-challenge/word-wheel/leaderboard/${date}/${language}?limit=100`);
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        const list: RivalScore[] = ((json.data || []) as LeaderboardRow[])
          .filter((r): r is LeaderboardRow & { score: number; display_name: string } => typeof r.score === 'number' && !!r.display_name)
          .map(r => ({
            name: r.display_name,
            score: r.score,
            avatarImage: r.avatar_image ?? null,
            customAvatar: r.custom_avatar ?? null,
            playerId: r.player_id ?? null,
            guestFingerprint: r.guest_fingerprint ?? null,
          }))
          // On a replay the player's own row is on the board; never make them their own rival.
          .filter(r => {
            if (currentPlayerId) return r.playerId !== currentPlayerId;
            if (currentGuestFingerprint) return r.guestFingerprint !== currentGuestFingerprint;
            return true;
          })
          .sort((a, b) => a.score - b.score);
        setRivals(list);
      } catch { /* leaderboard is best-effort */ }
    };
    const startPolling = () => { if (!interval) interval = setInterval(fetchRivals, 60_000); };
    const stopPolling = () => { if (interval) { clearInterval(interval); interval = null; } };
    const handleVisibility = () => {
      if (document.hidden) stopPolling();
      else { void fetchRivals(); startPolling(); }
    };
    void fetchRivals();
    startPolling();
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      cancelled = true;
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [enabled, language, puzzleDate, currentPlayerId, currentGuestFingerprint]);

  return rivals;
}

interface UsePassToastsArgs {
  enabled: boolean;
  rivals: readonly RivalScore[];
  score: number;
  onPass: () => void;
}

/** Queues a toast per newly passed rival, staggered so simultaneous passes do not stack. */
export function usePassToasts({ enabled, rivals, score, onPass }: UsePassToastsArgs) {
  const [toasts, setToasts] = useState<Array<{ id: number; name: string }>>([]);
  const passedRef = useRef<Set<string>>(new Set());
  const idRef = useRef(0);
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const onPassRef = useRef(onPass);
  onPassRef.current = onPass;

  useEffect(() => {
    if (!enabled || !rivals.length) return;
    const later = (fn: () => void, ms: number) => {
      const timer = setTimeout(() => { timersRef.current.delete(timer); fn(); }, ms);
      timersRef.current.add(timer);
    };
    newlyPassedRivals(rivals, score, passedRef.current).forEach((r, i) => {
      const id = ++idRef.current;
      later(() => {
        setToasts(prev => [...prev, { id, name: r.name }]);
        onPassRef.current();
        later(() => setToasts(prev => prev.filter(t => t.id !== id)), 2400);
      }, i * 250);
    });
  }, [enabled, rivals, score]);

  useEffect(() => () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current.clear();
  }, []);

  return toasts;
}
