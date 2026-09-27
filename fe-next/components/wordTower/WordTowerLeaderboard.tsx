'use client';

import { useEffect, useState } from 'react';
import { X, Trophy } from 'lucide-react';
import { getWithAuth } from '@/utils/authFetch';
import { getGuestFingerprint } from '@/utils/guestManager';
import Avatar from '@/components/Avatar';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';

interface Row {
  rank: number;
  /** Null for guests — they rank by fingerprint, which is never sent to the UI. */
  playerId: string | null;
  isYou: boolean;
  username: string;
  bestHeightM: number;
  floors: number;
  avatarConfig?: CustomAvatarConfig | null;
  avatarEmoji?: string | null;
  avatarColor?: string | null;
}

interface Props {
  onClose: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  dir: 'ltr' | 'rtl';
  language: string;
}

export function WordTowerLeaderboard({ onClose, t, dir, language }: Props) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // TODAY's board, not the lifetime one. Word Tower is a daily challenge; the
    // lifetime `word_tower_progress` board was auth-only, so guests saw a 401 and
    // an error state where its siblings show a populated daily leaderboard.
    const params = new URLSearchParams({ language });
    const fp = getGuestFingerprint();
    if (fp) params.set('guestFingerprint', fp);
    getWithAuth(`/api/word-tower/daily/score?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => { if (!cancelled) setRows(d.leaderboard ?? []); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [language]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      dir={dir}
    >
      <div
        className="max-h-[80dvh] w-full max-w-md overflow-hidden rounded-neo border-neo-thick border-black bg-neo-navy shadow-hard-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b-neo-thick border-black bg-neo-purple px-4 py-3">
          <h2 className="flex items-center gap-2 font-neo-display text-xl font-bold text-neo-white">
            <Trophy className="h-5 w-5 text-neo-yellow" /> {t('wordTower.leaderboard.title')}
          </h2>
          <button type="button" onClick={onClose} aria-label={t('common.close')} className="text-neo-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[64dvh] overflow-y-auto p-3">
          {error && <p className="py-8 text-center font-neo-body text-neo-red">{t('wordTower.leaderboard.error')}</p>}
          {!error && rows === null && (
            <p className="py-8 text-center font-neo-body text-neo-cyan">{t('wordTower.loading')}</p>
          )}
          {!error && rows?.length === 0 && (
            <p className="py-8 text-center font-neo-body text-neo-white/70">{t('wordTower.leaderboard.empty')}</p>
          )}
          {rows && rows.length > 0 && (
            <ol className="space-y-2">
              {rows.map((r) => (
                <li
                  // Guests have no playerId — rank is unique per board, so it is
                  // the only stable key available for them.
                  key={r.playerId ?? `guest-${r.rank}`}
                  className={`flex items-center justify-between rounded-neo border-neo border-black px-3 py-2 shadow-hard-sm ${
                    r.isYou ? 'bg-neo-lime text-black' : 'bg-neo-navy-light text-neo-white'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <span className="w-5 text-center font-neo-display font-bold tabular-nums">{r.rank}</span>
                    {/* A guest has neither avatar_config nor a userId, and Avatar
                        renders a permanent skeleton when given both as null — so
                        fall back to the emoji/colour the view already COALESCEs. */}
                    {r.playerId ? (
                      <Avatar
                        customAvatar={r.avatarConfig ?? undefined}
                        userId={r.playerId}
                        size="sm"
                        disableEffects tierMarker
                        className="shrink-0 rounded-full border border-black"
                      />
                    ) : (
                      <span
                        aria-hidden
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-black text-sm"
                        style={{ backgroundColor: r.avatarColor ?? '#6366f1' }}
                      >
                        {r.avatarEmoji ?? '🏗️'}
                      </span>
                    )}
                    <span className="font-neo-body font-bold">{r.username}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="font-neo-display font-bold tabular-nums">{Math.round(r.bestHeightM)} m</span>
                    <span className="text-xs opacity-70">{t('wordTower.leaderboard.floors', { count: r.floors })}</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
