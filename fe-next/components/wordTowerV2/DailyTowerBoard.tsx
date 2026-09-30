'use client';

import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import Avatar from '@/components/Avatar';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import { getWithAuth } from '@/utils/authFetch';
import { getGuestFingerprint } from '@/utils/guestManager';

interface Row {
  rank: number;
  playerId: string | null;
  isYou: boolean;
  username: string;
  /** Metres GROWN today (the daily score), not the tower's height. */
  bestHeightM: number;
  floors: number;
  avatarConfig?: CustomAvatarConfig | null;
  avatarEmoji?: string | null;
  avatarColor?: string | null;
}

type T = (key: string, params?: Record<string, string | number>) => string;

const TOP = 5;
const MEDAL = ['🥇', '🥈', '🥉'];

/**
 * Today's climbers: who grew their tower the most. The daily score is growth,
 * so the board reads "+N m" — height alone would just rank whoever started first.
 * Your row is always shown, even from rank 40.
 */
export function DailyTowerBoard({ t, language, refreshKey = 0 }: { t: T; language: string; refreshKey?: number }) {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    let live = true;
    const params = new URLSearchParams({ language });
    const fp = getGuestFingerprint();
    if (fp) params.set('guestFingerprint', fp);
    getWithAuth(`/api/word-tower/daily/score?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (live && d) setRows((d.leaderboard as Row[]) ?? []);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [language, refreshKey]);

  if (rows === null) return null;

  const top = rows.slice(0, TOP);
  const me = rows.find((r) => r.isYou);
  const shown = me && !top.includes(me) ? [...top, me] : top;

  return (
    <section data-wt2-board className="mt-4 rounded-neo border-neo-thick border-black bg-neo-navy p-2.5 text-neo-cream shadow-hard">
      <h3 className="flex items-center justify-center gap-1.5 font-neo-display text-sm font-black uppercase tracking-widest text-neo-yellow">
        <Trophy className="h-4 w-4" aria-hidden />
        {t('wordTowerV2.dailyTower.boardTitle')}
      </h3>
      {shown.length === 0 ? (
        <p className="py-3 text-center font-neo-display text-sm font-bold opacity-80">{t('wordTowerV2.dailyTower.boardEmpty')}</p>
      ) : (
        <ol className="mt-2 space-y-1.5">
          {shown.map((r) => (
            <li
              key={r.playerId ?? `guest-${r.rank}`}
              className={`flex items-center gap-2 rounded-neo border-neo border-black px-2 py-1.5 font-neo-display ${
                r.isYou ? 'bg-neo-lime text-neo-navy' : 'bg-neo-navy-light'
              }`}
            >
              <span className="w-7 text-center text-base font-black tabular-nums">
                {r.rank <= 3 ? <span aria-label={`#${r.rank}`}>{MEDAL[r.rank - 1]}</span> : `#${r.rank}`}
              </span>
              {r.playerId ? (
                <Avatar customAvatar={r.avatarConfig ?? undefined} userId={r.playerId} size="sm" disableEffects className="shrink-0 rounded-full border border-black" />
              ) : (
                <span
                  aria-hidden
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-black text-sm"
                  style={{ backgroundColor: r.avatarColor ?? '#6366f1' }}
                >
                  {r.avatarEmoji ?? '🏗️'}
                </span>
              )}
              <span className="min-w-0 flex-1 truncate text-sm font-bold">{r.username}</span>
              <span className="flex flex-col items-end leading-tight">
                <span className="text-base font-black tabular-nums">
                  +{Math.round(r.bestHeightM)}
                  {t('wordTowerV2.unitM')}
                </span>
                <span className="text-[10px] font-bold opacity-70">{t('wordTower.leaderboard.floors', { count: r.floors })}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
