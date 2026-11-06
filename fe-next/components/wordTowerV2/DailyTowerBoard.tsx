'use client';

import { useEffect, useMemo, useState } from 'react';
import { Hammer, Trophy } from 'lucide-react';
import Avatar from '@/components/Avatar';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import { getWithAuth } from '@/utils/authFetch';
import { getGuestFingerprint } from '@/utils/guestManager';
import { TowerMini, boardViewH } from './rivals/TowerMini';
import { type DailyRivalRow, dailyRivalTower, wreckSuggestion } from './rivals/dailyWreck';

interface Row extends DailyRivalRow {
  isGuest: boolean;
  isYou: boolean;
  avatarConfig?: CustomAvatarConfig | null;
  avatarEmoji?: string | null;
  avatarColor?: string | null;
}

type T = (key: string, params?: Record<string, string | number>) => string;

const TOP = 5;
const MEDAL = ['🥇', '🥈', '🥉'];
const SUGGEST_KEY = { ahead: 'wreckAhead', chasing: 'wreckChasing', leader: 'wreckLeader' } as const;

/**
 * Today's climbers: who grew their tower the most. The daily score is growth,
 * so the board reads "+N m" — height alone would just rank whoever started first.
 * Your row is always shown, even from rank 40. Everyone else's tower is a target:
 * the card on top dares you to knock down the one nearest you.
 */
export function DailyTowerBoard({
  t,
  language,
  refreshKey = 0,
  onWreck,
}: {
  t: T;
  language: string;
  refreshKey?: number;
  onWreck?: (row: DailyRivalRow) => void;
}) {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    let live = true;
    const params = new URLSearchParams({ language });
    const fp = getGuestFingerprint();
    if (fp) params.set('guestFingerprint', fp);
    // The GET is browser-cacheable for 30s; a board shown right after a climb or rename must be current.
    getWithAuth(`/api/word-tower/daily/score?${params.toString()}`, { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (live && d) setRows(((d.leaderboard as Row[]) ?? []).map((r) => ({ ...r, words: Array.isArray(r.words) ? r.words : [] })));
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [language, refreshKey]);

  const suggestion = useMemo(() => (rows && onWreck ? wreckSuggestion(rows) : null), [rows, onWreck]);
  const suggestTower = useMemo(() => (suggestion ? dailyRivalTower(suggestion.target) : null), [suggestion]);

  if (rows === null) return null;

  const top = rows.slice(0, TOP);
  const me = rows.find((r) => r.isYou);
  const shown = me && !top.includes(me) ? [...top, me] : top;

  return (
    <section data-wt2-board className="mt-4 rounded-neo border-neo-thick border-neo-cream/40 bg-neo-navy p-2.5 text-neo-cream shadow-hard">
      <h3 className="flex items-center justify-center gap-1.5 font-neo-display text-sm font-black uppercase tracking-widest text-neo-yellow">
        <Trophy className="h-4 w-4" aria-hidden />
        {t('wordTowerV2.dailyTower.boardTitle')}
      </h3>
      {suggestion && suggestTower && onWreck ? (
        <div data-wt2-wreck-dare className="mt-2 flex items-stretch gap-2 rounded-neo border-neo-thick border-neo-cream bg-neo-pink p-2 text-neo-navy shadow-hard">
          <TowerMini tower={suggestTower} viewH={boardViewH([suggestTower])} halfW={140} className="h-20 w-12 shrink-0 motion-safe:animate-[wt2-dare-sway_2.4s_ease-in-out_infinite] origin-bottom" />
          <div className="flex min-w-0 flex-1 flex-col justify-between gap-1.5">
            <p className="font-neo-display text-sm font-black leading-tight">
              {t(`wordTowerV2.dailyTower.${SUGGEST_KEY[suggestion.kind]}`, { name: suggestion.target.username, m: suggestion.gapM })}
            </p>
            <button
              type="button"
              onClick={() => onWreck(suggestion.target)}
              className="flex items-center justify-center gap-2 rounded-neo border-neo-thick border-neo-black bg-neo-lime px-3 py-2 font-neo-display text-base font-black uppercase text-neo-navy shadow-hard-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            >
              <Hammer className="h-5 w-5 shrink-0 motion-safe:animate-zap-wiggle" aria-hidden />
              <span className="truncate">{t('wordTowerV2.dailyTower.wreckCta')}</span>
            </button>
          </div>
          <style>{'@keyframes wt2-dare-sway{0%,100%{transform:rotate(0)}20%{transform:rotate(-4deg)}40%{transform:rotate(3deg)}55%{transform:rotate(-1.5deg)}70%{transform:rotate(0)}}'}</style>
        </div>
      ) : null}
      {shown.length === 0 ? (
        <p className="py-3 text-center font-neo-display text-sm font-bold opacity-80">{t('wordTowerV2.dailyTower.boardEmpty')}</p>
      ) : (
        <ol className="mt-2 space-y-1.5">
          {shown.map((r) => (
            <li
              key={`${r.rank}-${r.username}`}
              className={`flex items-center gap-2 rounded-neo border-neo px-2 py-1.5 font-neo-display ${
                r.isYou ? 'border-neo-black bg-neo-lime text-neo-navy' : 'border-neo-cream/30 bg-neo-navy-light'
              }`}
            >
              <span className="w-7 text-center text-base font-black tabular-nums">
                {r.rank <= 3 ? <span aria-label={`#${r.rank}`}>{MEDAL[r.rank - 1]}</span> : `#${r.rank}`}
              </span>
              {!r.isGuest ? (
                <Avatar customAvatar={r.avatarConfig ?? undefined} userId={r.username} size="sm" disableEffects className="shrink-0 rounded-full border border-neo-black" />
              ) : (
                <span
                  aria-hidden
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-neo-black text-sm"
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
              {onWreck && !r.isYou ? (
                <button
                  type="button"
                  onClick={() => onWreck(r)}
                  aria-label={t('wordTowerV2.dailyTower.wreckRow', { name: r.username })}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-neo border-neo border-neo-black bg-neo-pink text-neo-navy shadow-hard-sm active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                >
                  <Hammer className="h-4 w-4" aria-hidden />
                </button>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
