'use client';

import Avatar from '@/components/Avatar';
import { useLanguage } from '@/contexts/LanguageContext';
import type { QuickGhostRival } from '@/lib/quickPlay/ghostRivals';

interface QuickRivalsPassedProps {
  /** The rivals this round actually raced (from the round payload). */
  rivals: QuickGhostRival[];
  myScorePct: number;
  myName: string;
  myUserId?: string;
  myAvatar?: import('@/shared/types/customAvatar').CustomAvatarConfig | null;
}

/**
 * Where you landed in the round's field.
 *
 * Quick Play already races ghost rivals during the round, then dropped them the
 * moment it ended — so the screen that decides whether you play again showed no
 * opponent at all. This is the standings the race earned: everyone sorted, you
 * in your place, the ones you passed marked as passed.
 */
export function QuickRivalsPassed({ rivals, myScorePct, myName, myUserId, myAvatar }: QuickRivalsPassedProps) {
  const { t } = useLanguage();
  if (rivals.length === 0) return null;

  const passed = rivals.filter((r) => myScorePct > r.scorePct).length;
  const rows = [
    ...rivals.map((r) => ({
      key: r.userId,
      name: r.name,
      pct: r.scorePct,
      userId: r.userId,
      customAvatar: r.customAvatar ?? undefined,
      isMe: false,
    })),
    { key: '__me', name: myName, pct: myScorePct, userId: myUserId ?? 'quick-guest', customAvatar: myAvatar ?? undefined, isMe: true },
  ].sort((a, b) => b.pct - a.pct);

  return (
    <div
      className="overflow-hidden rounded-2xl border-neo-thick border-black bg-neo-navy-elevated shadow-hard"
      data-testid="quick-rivals-passed"
    >
      <div className="flex items-baseline justify-between border-b-2 border-black/40 px-3 py-2">
        <span className="font-neo-display text-[10px] uppercase tracking-[0.18em] text-neo-white/55">
          {t('quickPlay.solo.raceStandings', 'This round')}
        </span>
        <span className="font-neo-display text-xs font-bold text-neo-lime" data-testid="quick-rivals-passed-count">
          {t('quickPlay.solo.rivalsPassed', 'Passed {passed} of {total}', {
            passed: String(passed),
            total: String(rivals.length),
          })}
        </span>
      </div>
      <ul>
        {rows.map((row, i) => (
          <li
            key={row.key}
            data-testid={row.isMe ? 'quick-rival-row-me' : 'quick-rival-row'}
            className={`flex items-center gap-2.5 border-b-2 border-black/30 px-3 py-1.5 text-sm last:border-b-0 ${
              row.isMe ? 'bg-neo-lime/15 text-neo-cream' : 'text-neo-cream/85'
            }`}
          >
            <span className="w-4 text-center font-neo-display text-xs font-bold text-neo-white/45">{i + 1}</span>
            <Avatar userId={row.userId} customAvatar={row.customAvatar} size="sm" disableEffects />
            <span className="min-w-0 flex-1 truncate">{row.name}</span>
            {!row.isMe && myScorePct > row.pct && (
              <span className="shrink-0 rounded-md border-2 border-black bg-neo-lime px-1.5 text-[10px] font-bold uppercase tracking-wide text-black">
                {t('quickPlay.solo.passed', 'passed')}
              </span>
            )}
            <span className="w-11 shrink-0 text-right font-neo-display font-bold tabular-nums">{row.pct}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
