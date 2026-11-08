'use client';

import Avatar from '@/components/Avatar';
import { useLanguage } from '@/contexts/LanguageContext';
import type { QuickGhostRival } from '@/lib/quickPlay/ghostRivals';
import { QuickDetailCard } from './QuickDetailCard';

const MEDAL = ['bg-neo-yellow', 'bg-neo-cyan', 'bg-neo-orange'];

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
    <QuickDetailCard
      testId="quick-rivals-passed"
      band="bg-neo-lime"
      title={t('quickPlay.solo.raceStandings', 'This round')}
      aside={
        <span data-testid="quick-rivals-passed-count">
          {t('quickPlay.solo.rivalsPassed', 'Passed {passed} of {total}', {
            passed: String(passed),
            total: String(rivals.length),
          })}
        </span>
      }
    >
      <ul>
        {rows.map((row, i) => (
          <li
            key={row.key}
            data-testid={row.isMe ? 'quick-rival-row-me' : 'quick-rival-row'}
            className={`flex items-center gap-2.5 border-b-2 border-black/30 px-3 py-2 text-sm last:border-b-0 ${
              row.isMe
                ? 'relative z-10 mx-1 -rotate-1 rounded-lg border-[3px] border-black bg-neo-yellow font-bold text-black shadow-hard'
                : 'text-neo-cream/85'
            }`}
          >
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 border-black font-neo-display text-xs font-bold ${
                i < 3 ? `${MEDAL[i]} text-black` : row.isMe ? 'text-black' : 'text-neo-white/60'
              }`}
            >
              {i + 1}
            </span>
            <Avatar userId={row.userId} customAvatar={row.customAvatar} size="sm" disableEffects />
            <span className="min-w-0 flex-1 truncate">{row.name}</span>
            {!row.isMe && myScorePct > row.pct && (
              <span className="shrink-0 -rotate-6 rounded-md border-2 border-black bg-neo-lime px-1.5 font-neo-display text-[10px] font-bold uppercase tracking-wide text-black shadow-hard-sm">
                {t('quickPlay.solo.passed', 'passed')}
              </span>
            )}
            <span className={`w-12 shrink-0 text-end font-neo-display font-bold tabular-nums ${row.isMe ? 'text-base' : ''}`} dir="ltr">{row.pct}%</span>
          </li>
        ))}
      </ul>
    </QuickDetailCard>
  );
}
